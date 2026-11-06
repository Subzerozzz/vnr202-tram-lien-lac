import test from 'node:test';
import assert from 'node:assert/strict';
import {audioPreferences, vietnameseVoices, narrationSentences, RadioAudio, Narrator} from '../dist/audio.js';

function clock() {
  const tasks = new Map(); let next = 0;
  return {
    tasks,
    schedule(fn, delay) { tasks.set(++next, {fn, delay}); return next; },
    cancel(id) { tasks.delete(id); },
    tick() { const [id, task] = tasks.entries().next().value; tasks.delete(id); task.fn(); },
  };
}

test('new and legacy saves enable sound; a new explicit mute remains muted', () => {
  assert.equal(audioPreferences().sound, true);
  assert.equal(audioPreferences({sound:false,version:1}).sound, true);
  assert.equal(audioPreferences({audioVersion:2,sound:false}).sound, false);
  assert.equal(audioPreferences({audioVersion:2,voice:'Linh',narrationStyle:'broadcast'}).voice, 'Linh');
});

test('automatic voice selection prefers high quality Vietnamese, not English', () => {
  const voices=vietnameseVoices([
    {name:'English Natural',lang:'en-US',voiceURI:'en'},
    {name:'Linh',lang:'vi-VN',voiceURI:'local',localService:true},
    {name:'Vietnamese Neural',lang:'vi-VN',voiceURI:'neural',localService:false},
  ]);
  assert.deepEqual(voices.map(v=>v.voiceURI), ['neural','local']);
});

test('spoken dates, abbreviations and sentence boundaries are readable', () => {
  const sentences=narrationSentences('Hội nghị Trung ương VIII (5/1941). Ngày 19/5/1959 mở đường. Đại hội III xây dựng CNXH.');
  assert.equal(sentences.length,3);
  assert.match(sentences[0],/Trung ương tám \(tháng 5 năm 1941\)/);
  assert.match(sentences[1],/ngày 19 tháng 5 năm 1959/);
  assert.match(sentences[2],/Đại hội ba xây dựng chủ nghĩa xã hội/);
});

test('home audio waits for interaction, creates one loop, and stops on mute or navigation', async () => {
  const timers=clock(), oscillators=[];
  const context={state:'suspended',currentTime:0,destination:{},
    resume(){this.state='running';return Promise.resolve();},
    suspend(){this.state='suspended';return Promise.resolve();},
    createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};},
    createOscillator(){const o={frequency:{value:0},connect(){},disconnect(){},start(){},stop(){this.stopped=true;}};oscillators.push(o);return o;},
  };
  let created=0;
  const radio=new RadioAudio({createContext:()=>{created++;return context;},schedule:timers.schedule,cancel:timers.cancel});
  radio.setHome(true);
  assert.equal(created,0);
  assert.equal(timers.tasks.size,0);
  radio.activate();await Promise.resolve();
  assert.equal(radio.ready,true);
  assert.equal(timers.tasks.size,1);
  assert.equal(oscillators.length,4);
  radio.setHome(true);radio.activate();
  assert.equal(timers.tasks.size,1);
  radio.setEnabled(false);
  assert.equal(timers.tasks.size,0);
  assert.equal(radio.sources.size,0);
  radio.setEnabled(true);
  assert.equal(timers.tasks.size,1);
  radio.setHome(false);
  assert.equal(timers.tasks.size,0);
  assert.equal(radio.sources.size,0);
  radio.setHome(true);radio.setVisible(false);
  assert.equal(timers.tasks.size,0);
  assert.equal(radio.ready,false);
});

test('narration uses the chosen voice, pauses between sentences, and cancels stale callbacks', () => {
  const timers=clock(), spoken=[], states=[], errors=[];
  const voice={name:'Giọng Việt',voiceURI:'vi-voice',lang:'vi-VN'};
  const synth={getVoices:()=>[voice],cancel(){},speak:u=>spoken.push(u)};
  const narrator=new Narrator({synth,Utterance:class{constructor(text){this.text=text;}},schedule:timers.schedule,cancel:timers.cancel,onState:x=>states.push(x),onError:x=>errors.push(x)});
  narrator.play('Tín hiệu đã thông. Mời đồng chí tiếp tục.',{voice:'vi-voice',style:'natural'});
  assert.equal(spoken[0].voice,voice);
  assert.equal(spoken[0].rate,1);
  spoken[0].onend();
  assert.equal(timers.tasks.size,1);
  assert.equal([...timers.tasks.values()][0].delay,300);
  timers.tick();
  assert.equal(spoken[1].text,'Mời đồng chí tiếp tục.');
  assert.equal(spoken[1].rate,.97);
  const old=spoken[1];
  narrator.stop();
  old.onend();old.onerror({error:'interrupted'});
  assert.equal(timers.tasks.size,0);
  assert.equal(narrator.playing,false);
  assert.deepEqual(states,[true,false]);
  assert.deepEqual(errors,[]);
});
