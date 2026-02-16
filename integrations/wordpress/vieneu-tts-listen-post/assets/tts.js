(function () {
  document.addEventListener('click', function (e) {
    if (!e.target.matches('.vieneu-tts-btn')) return;
    var btn = e.target;
    var wrap = btn.closest('.vieneu-tts-wrap');
    var audioEl = wrap.querySelector('.vieneu-tts-audio');
    var errEl = wrap.querySelector('.vieneu-tts-error');
    var post = wrap.closest('.entry-content, .post-content, .content') || document.querySelector('.entry-content, .post-content, article .content');
    var text = post ? post.innerText.replace(/\s+/g, ' ').trim() : '';
    if (!text) {
      errEl.textContent = 'Không tìm thấy nội dung bài viết.';
      return;
    }
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
    var requestId = 'wp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    var formData = new FormData();
    formData.append('action', 'vieneu_tts_synthesize');
    formData.append('nonce', btn.dataset.nonce);
    formData.append('request_id', requestId);
    formData.append('text', text.slice(0, 5000));
    fetch(vieneuTts.ajaxUrl, {
      method: 'POST',
      body: formData,
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.success) {
          throw new Error((data.data && data.data.message) || 'Lỗi không xác định');
        }
        var jobId = data.data && data.data.job_id;
        if (!jobId) throw new Error('Không nhận được job_id');
        return pollJob(jobId, requestId);
      })
      .then(function (audioUrl) {
        audioEl.innerHTML = '<audio controls src="' + audioUrl + '"></audio>';
        btn.disabled = false;
        btn.textContent = 'Nghe bài viết';
      })
      .catch(function (err) {
        errEl.textContent = err.message || 'Có lỗi xảy ra.';
        btn.disabled = false;
        btn.textContent = 'Nghe bài viết';
      });
  });

  function pollJob(jobId, requestId) {
    return new Promise(function (resolve, reject) {
      function poll() {
        fetch(
          vieneuTts.ajaxUrl +
            '?action=vieneu_tts_job_status&job_id=' +
            encodeURIComponent(jobId) +
            '&request_id=' +
            encodeURIComponent(requestId)
        )
          .then(function (r) {
            return r.json();
          })
          .then(function (data) {
            var st = data.status || (data.success && data.data && data.data.status);
            var url = data.audio_url || (data.data && data.data.audio_url);
            var err = data.error_message || (data.data && data.data.error_message);
            if (st === 'completed' && url) {
              resolve(url);
            } else if (st === 'failed') {
              reject(new Error(err || 'Synthesis thất bại'));
            } else {
              setTimeout(poll, 1500);
            }
          })
          .catch(reject);
      }
      poll();
    });
  }
})();
