var request = require('request');
var https = require('https');
var token = '425349458:AAEIe-YXDDjEAUNhVzot8mFEkmVrS4bw9K8';
var fs = require('fs');
var urlencode = require('urlencode');



function sendVideo(path, caption, telegramUrl){
  var formData = {
    chat_id: telegramUrl,
    video: fs.createReadStream(path),
    caption:caption
  };
  request.post({url:'https://api.telegram.org/bot'+token+'/sendVideo', formData: formData}, (err, httpResponse, body) => {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
    fs.unlink(path, ()=>{
      if (err) console.log('Удаление файла невозможно: '+err);
    });
  });

}

function sendPhoto(path, caption, telegramUrl, timeout){
  var formData = {
    chat_id: telegramUrl,
    photo: fs.createReadStream(path),
    caption:caption
  };
  setTimeout(()=>{
  request.post({url:'https://api.telegram.org/bot'+token+'/sendPhoto', formData: formData}, (err, httpResponse, body) => {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
    fs.unlink(path, ()=>{
      if (err) console.log('Удаление файла невозможно: '+err);
    });
  });}, timeout);
}

function sendMessage (caption, telegramUrl){
  request.get('https://api.telegram.org/bot'+token+'/sendMessage?chat_id='+telegramUrl+'&text='+urlencode(caption));
  console.log(caption);
  //console.log('https://api.telegram.org/bot'+token+'/sendMessage?chat_id='+telegramUrl+'&text='+urlencode(caption));
}

function telegram(post, telegramUrl){
  if ((post.gifsUrls.length+post.videoUrls.length+post.imageUrls.length==0)||(post.text.length>200)){
    sendMessage(post.text, telegramUrl);
    post.text='';
  }
  else{
    for (var i = 0; i < post.imageUrls.length; i++) {
      sendPhoto('./images/' + post.name + '-' + i + '.' + post.imageUrls[i].substring(post.imageUrls[i].length - 3), post.text, telegramUrl, i*2000);
      post.text='';
    }
    for (var i = 0; i < post.gifsUrls.length; i++) {
      sendVideo('./gifs/' + post.name + '-' + i + '.mp4', post.text, telegramUrl);
      post.text='';
    }
    for (var i = 0; i < post.videoUrls.length; i++) {
      sendVideo('./videos/' + post.name + '-' + i + '.mp4', post.text, telegramUrl);
      post.text='';
    }
  }
}

module.exports = telegram;
