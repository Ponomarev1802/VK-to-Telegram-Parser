var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var ee = require('events').EventEmitter;
var publicks = require('./publicks.js');
var telegram = require('./telegram.js');
//var setTimeout = require('timers').setTimeout;
setInterval(()=>{
  for (var i = 0; i < publicks.length; i++) {
    rpdp(publicks[i]);
  }
}, 60000);



function checkElem (elem, publick){
  if (fs.existsSync('./'+publick.substring(1)+'/'+elem.name)) {return false;}
  else {fs.writeFile('./'+publick.substring(1)+'/'+elem.name, '')
  return true;}
}


function rpdp (publick){
  var result = [];
  request({
      uri: publick.vkUrl,
      method: 'GET',
      encoding: 'utf8'
  }, (err, res, body) => {
      if (err) console.log(err);
      //fs.writeFile('1.html', body);
      var $ = cheerio.load(body);
      var wiBodyArr = $('.wall_item');
      for (var i = 0; i < wiBodyArr.length; i++) {
        var wiBodyElem = parser(wiBodyArr[i + '']);
          if (wiBodyElem) {
                if (checkElem(wiBodyElem, publick.telegramUrl)) result.push(wiBodyElem)
          }
      }
      //console.log(result);
      for (var i = 0; i < result.length; i++) {
          contentDownload(result[i], publick.telegramUrl);
      }

  });
}

function contentDownload(post, telegramUrl) {
//listenerOfDownloadingContent
  post.countOfDownload = post.gifsUrls.length+post.videoUrls.length+post.imageUrls.length;

  post.downloadListener = new ee;
  function oneMore(post){
    post.countOfDownload--;
    console.log(post.countOfDownload);
    if (post.countOfDownload==0) post.downloadListener.emit('finish'+post.name, post);
  }
  post.downloadListener.on('oneMore'+post.name, oneMore);
  function onFinish(post){
    telegram(post, telegramUrl)
    post.downloadListener.removeListener('oneMore'+post.name, oneMore);
    post.downloadListener.removeListener('finish'+post.name, onFinish)

  }
  post.downloadListener.on('finish'+post.name, onFinish);
  if (post.countOfDownload == 0) {post.downloadListener.emit('finish'+post.name, post);}



    //gifsDownload
    if (post.gifsUrls.length > 0) {
        for (var i = 0; i < post.gifsUrls.length; i++) {
          downloadGifImage('https://vk.com' + post.gifsUrls[i] + '&wnd=1&mp4=1', './gifs/' + post.name + '-' + i + '.mp4', post)
        }
    };



    //imagesDownload
    if (post.imageUrls.length > 0) {
        for (var i = 0; i < post.imageUrls.length; i++) {
          downloadGifImage(post.imageUrls[i], './images/' + post.name + '-' + i + '.' + post.imageUrls[i].substring(post.imageUrls[i].length - 3), post)
        }
    }



    //videosDownload
    if (post.videoUrls.length > 0) {
        for (var i = 0; i < post.videoUrls.length; i++) {
          downloadVideo ('https://m.vk.com/' + post.videoUrls[i], './videos/' + post.name + '-' + i + '.mp4', post)
        }
    }



}


function downloadVideo (path, filename, post){
  request({
      uri: path,
      method: 'GET',
      encoding: 'utf8'
  }, (err, res, body) => {
      if (err) console.log(err);

      if (!(cheerio.load(body)('video>source')['0'])){
        cancelDownloading(post);
        return;
      }


      var tempStrVideo = cheerio.load(body)('video>source')['0'].attribs.src;
      tempStrVideo = tempStrVideo.substring(0, tempStrVideo.indexOf('?extra'));

      request.get(tempStrVideo)
          .on('error', function(err) {
              console.error(err);
          })
          .on('response', function(res) {})
          .pipe(fs.createWriteStream(filename))
          .on('finish', function() {
              console.log('video: ' + post.name);
              post.downloadListener.emit('oneMore'+post.name, post);
          });
  });
}

function downloadGifImage(path, filename, post){
  request.get(path)
      .on('error', function(err) {
          console.error(err);
      })
      .on('response', function(res) {})
      .pipe(fs.createWriteStream(filename))
      .on('finish', function() {
          console.log('image/gif: ' + post.name);
          post.downloadListener.emit('oneMore'+post.name, post);
      });
}

function cancelDownloading (post){
  post.imageUrls = [];
  post.videoUrls = [];
  post.gifsUrls = [];
  post.text = '';
  post.downloadListener.emit('finish'+post.name, post);
}


function parser(wiBodyObj) {
    //textParser
    var text = cheerio.load(wiBodyObj)('.pi_text').text();
    if (cheerio.load(wiBodyObj)('.pi_text>.pi_text_more').length>0){
      text = (cheerio.load(wiBodyObj)('.pi_text>.pi_text_more').prev().text());
      text +=(cheerio.load(wiBodyObj)('.pi_text>.pi_text_more').next().text());
      //text= text + cheerio.load(wiBodyObj)('.pi_text>.pi_text_more').next()[0+''].children[0].data;
    }
    //console.log(text);
    //checkToAds
    if ((text.indexOf('http://') + 1) || (text.indexOf('https://') + 1) || (text.indexOf('vk.com/') + 1) || (text.indexOf('vk.cc/') + 1)/* || cheerio.load(wiBodyObj)('.pi_text>a').length > 0*/) {console.log('реклама не пропущена');return;}

    //imagesOrVideoParser
    var imageUrls = [];
    var videoUrls = [];
    if ((cheerio.load(wiBodyObj)('a.thumb_map')).length > 0) {
        if ((cheerio.load(wiBodyObj)('a.thumb_map'))['0'].attribs.href.indexOf('/photo') + 1) {
            var imageArr = cheerio.load(wiBodyObj)('a.thumb_map>div');
            for (var i = 0; i < imageArr.length; i++) {
              //console.log(imageArr[i + '']);
                var tempStr = (imageArr[i + ''].attribs['data-src_big']);
                if (tempStr) imageUrls.push(tempStr.substring(0, tempStr.length - 8));
            }
        }
        if (cheerio.load(wiBodyObj)('a.thumb_map')['0'].attribs.href.indexOf('/video') + 1) {
            for (var i = 0; i < cheerio.load(wiBodyObj)('a.thumb_map').length; i++) {
                videoUrls.push(cheerio.load(wiBodyObj)('a.thumb_map')[i + ''].attribs.href);
            }
        }
    }

    //gifsParser
    var gifsUrls = [];
    var gifsArr = cheerio.load(wiBodyObj)('a.doc_preview_gif');
    for (var i = 0; i < gifsArr.length; i++) {
        gifsUrls.push(gifsArr[i + ''].attribs.href);
    }
    return ({
        name: wiBodyObj.children[1].attribs.name,
        text: text,
        imageUrls: imageUrls,
        videoUrls: videoUrls,
        gifsUrls: gifsUrls
    });
}
