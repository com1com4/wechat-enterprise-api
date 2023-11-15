var path = require('path');
var fs = require('fs');
var formstream = require('formstream');
var util = require('./util');
var wrapper = util.wrapper;

/**
 * 上传多媒体文件，分别有图片（image）、语音（voice）、视频（video）和普通文件（file）
 * 详情请见：<http://qydev.weixin.qq.com/wiki/index.php?title=上传媒体文件>
 * Examples:
 * ```
 * api.uploadMedia(filepathOrMeta, type, callback);
 * ```
 * Callback:
 *
 * - `err`, 调用失败时得到的异常
 * - `result`, 调用正常时得到的对象
 *
 * Result:
 * ```
 * {"type":"image","media_id":"0000001","created_at":123456789}
 * ```
 * Shortcut:
 *
 * - `exports.uploadImage(filepathOrMeta, callback);`
 * - `exports.uploadVoice(filepathOrMeta, callback);`
 * - `exports.uploadVideo(filepathOrMeta, callback);`
 * - `exports.uploadFile(filepathOrMeta, callback);`
 *
 * @param {String} filepathOrMeta 文件路径或元数据结构{buffer, filename, mime}
 * @param {String} type 媒体类型，可用值有image、voice、video、file
 * @param {Function} callback 回调函数
 */
exports.uploadMedia = function (filepathOrMeta, type, callback) {
  this.preRequest(this._uploadMedia, arguments);
};

/*!
 * 上传多媒体文件的未封装版本
 */
exports._uploadMedia = function (filepathOrMeta, type, callback) {
  var that = this;
  var form = formstream();
  if (typeof filepathOrMeta === 'string') {
    var filepath = filepathOrMeta
    fs.stat(filepath, function (err, stat) {
      if (err) {
        return callback(err);
      }
      form.file('media', filepath, path.basename(filepath), stat.size);
      _request()
    });
  } else {
    var meta = filepathOrMeta
    if(Buffer.isBuffer(meta.buffer)) {
      var buff = meta.buffer
      form.buffer('media', buff, meta.filename, meta.mime)
      _request()
    }
  }
  function _request() {
    var url = that.prefix + 'media/upload?access_token=' + that.token.accessToken + '&type=' + type;
    var opts = {
      dataType: 'json',
      type: 'POST',
      timeout: 60000, // 60秒超时
      headers: form.headers(),
      stream: form
    };
    that.request(url, opts, wrapper(callback));
  }
  
};

['image', 'voice', 'video', 'file'].forEach(function (type) {
  var method = 'upload' + type[0].toUpperCase() + type.substring(1);
  exports[method] = function (filepathOrMeta, callback) {
    this.uploadMedia(filepathOrMeta, type, callback);
  };
});

/**
 * 根据媒体ID获取媒体内容
 * 详情请见：<http://qydev.weixin.qq.com/wiki/index.php?title=获取媒体文件>
 * Examples:
 * ```
 * api.getMedia('media_id', callback);
 * ```
 * Callback:
 *
 * - `err`, 调用失败时得到的异常
 * - `result`, 调用正常时得到的文件Buffer对象
 * - `res`, HTTP响应对象
 *
 * @param {String} mediaId 媒体文件的ID
 * @param {Function} callback 回调函数
 */
exports.getMedia = function (mediaId, callback) {
  this.preRequest(this._getMedia, arguments);
};

/*!
 * 上传多媒体文件的未封装版本
 */
exports._getMedia = function (mediaId, callback) {
  var url = this.prefix + 'media/get?access_token=' + this.token.accessToken + '&media_id=' + mediaId;
  this.request(url, {}, wrapper(function (err, data, res) {
    // handle some err
    if (err) {
      return callback(err);
    }
    var contentType = res.headers['content-type'];
    if (contentType === 'application/json') {
      var ret;
      try {
        ret = JSON.parse(data);
        if (ret.errcode) {
          err = new Error(ret.errmsg);
          err.name = 'WeChatAPIError';
        }
      } catch (ex) {
        callback(ex, data, res);
        return;
      }
      callback(err, ret, res);
    } else {
      // 输出Buffer对象
      callback(null, data, res);
    }
  }));
};
