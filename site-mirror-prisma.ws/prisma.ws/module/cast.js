(function () {
  'use strict';

  function _classCallCheck(a, n) {
    if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o);
    }
  }
  function _createClass(e, r, t) {
    return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", {
      writable: !1
    }), e;
  }
  function _toPrimitive(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }

  var Time = /*#__PURE__*/function () {
    function Time() {
      var _this = this;
      _classCallCheck(this, Time);
      this.time_offset = 0;
      this.updates = [];
      setInterval(function () {
        _this.updates.forEach(function (call) {
          return call();
        });
      }, 1000 * 10);
    }
    return _createClass(Time, [{
      key: "set",
      value: function set(time) {
        this.time_offset = time - Date.now();
      }
    }, {
      key: "get",
      value: function get() {
        var date = new Date(),
          time = date.getTime() + this.time_offset;
        date = new Date(time);
        return date.getTime();
      }
    }, {
      key: "left",
      value: function left(to) {
        return to - this.get();
      }
    }, {
      key: "addUpdate",
      value: function addUpdate(call) {
        this.updates.push(call);
      }
    }, {
      key: "removeUpdate",
      value: function removeUpdate(call) {
        Prisma.Arrays.remove(this.updates, call);
      }
    }]);
  }();
  var TimeInstance = new Time();

  var Api = /*#__PURE__*/function () {
    function Api() {
      _classCallCheck(this, Api);
      this.network = new Prisma.Reguest();
    }
    return _createClass(Api, [{
      key: "get",
      value: function get(successCallback, errorCallback) {
        var _this = this;
        var url = Prisma.Utils.protocol() + Prisma.Manifest.luno_domain + '/api/sport/get';
        this.network.silent(url, function (data) {
          if (data && data.results.length > 0) {
            TimeInstance.set(data.now);
            successCallback(data.results);
          } else {
            errorCallback ? errorCallback('No sport data available') : console.error('No sport data available');
          }
        }, function (e) {
          if (errorCallback) errorCallback(_this.network.errorCode(e));
        });
      }
    }]);
  }();
  var ApiInstance = new Api();

  var Stat = /*#__PURE__*/function () {
    function Stat() {
      _classCallCheck(this, Stat);
      this.ready_index = {};
      this.sessionId = this.generateSessionId();
    }
    return _createClass(Stat, [{
      key: "generateSessionId",
      value: function generateSessionId() {
        // Генерируем уникальный session ID на основе времени и случайного числа
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
    }, {
      key: "send",
      value: function send(index) {
        if (this.ready_index[index]) return;
        this.ready_index[index] = true;

        // Собираем параметры как в других частях prisma
        var params = new URLSearchParams({
          index: index,
          uid: Prisma.Storage.get('prisma_uid', ''),
          platform: Prisma.Platform.get(),
          sid: this.sessionId
        });
        var url = Prisma.Utils.protocol() + Prisma.Manifest.luno_domain + '/api/ad/view?' + params.toString();

        // Отправляем запрос с дополнительными заголовками
        $.ajax({
          url: url,
          method: 'GET',
          headers: {
            'User-Agent': navigator.userAgent,
            'Referer': window.location.href
          },
          timeout: 10000,
          success: function success(data) {
            console.log('Broadcast view stat sent successfully for index:', index);
          },
          error: function error(xhr, status, _error) {
            console.warn('Failed to send broadcast view stat for index:', index, _error);
          }
        });
      }
    }]);
  }();
  var StatInstance = new Stat();

  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  var next = 0;
  var Card = /*#__PURE__*/function () {
    function Card() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      _classCallCheck(this, Card);
      this.data = data;
      this.params = params;
    }
    return _createClass(Card, [{
      key: "create",
      value: function create() {
        var _this = this;
        this.card = $("<div class=\"card selector layer--visible layer--render card--small\">\n            <div class=\"card__view\" style=\"margin-bottom: 1em;\">\n                <img class=\"card__img\">\n                <div class=\"card__promo\">\n                    <div class=\"card__promo-title\"></div>\n                    <div class=\"card__promo-text\"></div>\n                </div>\n                <div class=\"card__age\"></div>\n            </div>\n            <div class=\"card__title\"></div>\n        </div>")[0];
        this.img = this.card.querySelector('.card__img') || {};
        var time_start = Prisma.Utils.parseTime(this.data.time_start);
        var time_now = Prisma.Utils.parseTime(Date.now());
        this.card.querySelector('.card__title').innerText = this.data.title;
        this.card.querySelector('.card__age').innerText = time_start.day == time_now.day ? 'В ' + time_start.time : time_start.briefly;
        this.card.querySelector('.card__promo-title').innerText = '';
        this.card.querySelector('.card__promo-text').innerText = '';
        if (this.params.type === 'watch') {
          this.card.classList.add('card--wide');
          var resume = this.data.status == 'live';
          var seconds_left = TimeInstance.left(this.data.time_start);
          var isLive = resume || seconds_left < 0 && TimeInstance.left(this.data.time_end) > 0;
          if (isLive || resume) {
            var statusEl = $("\n                    <div class=\"broadcast__status broadcast__status--live\">\n                        <div class=\"broadcast__status-marker\"></div>\n                        <div class=\"broadcast__status-text\">LIVE</div>\n                    </div>\n                ");
            this.card.querySelector('.card__view').append(statusEl[0]);
          }
          this.card.addEventListener('hover:enter', function () {
            var resume = _this.data.status == 'live';
            if (TimeInstance.left(_this.data.time_end) < 0 && !resume) {
              Prisma.Bell.push({
                text: Prisma.Lang.translate('broadcast_final_end')
              });
            } else if (TimeInstance.left(_this.data.time_start) < 0 || resume) {
              var ad = next < Date.now() ? 'https://a.utraff.com/vast/QHqCuJfaSHIxZ-yw8OUCkmxpRzFeokikE2uCp9Oa8o4.xml' : false;
              next = Date.now() + 1000 * 60 * random(30, 80);
              var streams = Prisma.Arrays.getKeys(_this.data.streams).filter(function (a) {
                return a !== 'abr';
              });
              streams.sort(function (a, b) {
                return parseInt(b) - parseInt(a);
              });
              var stream = _this.data.streams[streams[0]];
              Prisma.Player.iptv({
                title: Prisma.Lang.translate('broadcast_final_title'),
                url: Prisma.Utils.fixProtocolLink(stream),
                position: 0,
                total: 1,
                vast_url: ad,
                vast_msg: Prisma.Lang.translate('ad'),
                onGetChannel: function onGetChannel() {
                  var channel = {
                    url: Prisma.Utils.fixProtocolLink(stream),
                    name: _this.data.title,
                    group: _this.data.type || '',
                    icons: [],
                    position: 0,
                    total: 1
                  };
                  Prisma.Player.programReady({
                    channel: channel,
                    position: 0,
                    total: 1
                  });
                  return channel;
                },
                onGetProgram: function onGetProgram(channel, position, container) {
                  container[0].empty().text(Prisma.Lang.translate('broadcast_final_program'));
                }
              });
              StatInstance.send(0);
            } else {
              Prisma.Bell.push({
                text: Prisma.Lang.translate('broadcast_final_start_not_yet')
              });
            }
          });
          this.timeLeft = this.updateTimeLeft.bind(this);
          TimeInstance.addUpdate(this.timeLeft);
          this.updateTimeLeft();
        } else {
          var parse_time = Prisma.Utils.parseTime(this.data.time_start);
          var date = $("\n                <div style=\"position: absolute; left: 1em; top: 0.8em; background:rgba(0, 0, 0, 0.6); padding: 0.6em 0.8em; border-radius: 0.3em; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); backdrop-filter: blur(5px);\">\n                    <div style=\"font-size: 2.4em; font-weight: 700; line-height: 0.9; margin-bottom: 0.2em; color: #fff;\">".concat(parse_time.day, "</div>\n                    <div style=\"font-size: 1em; color: rgba(255, 255, 255, 0.9); text-transform: uppercase; letter-spacing: 0.05em;\">").concat(parse_time.mouth, "</div>\n                </div>\n            "));
          this.card.querySelector('.card__view').append(date[0]);
          var _statusEl = $("\n                <div class=\"broadcast__status broadcast__status--soon\">\n                    <div class=\"broadcast__status-marker\"></div>\n                    <div class=\"broadcast__status-text\">\u0421\u041A\u041E\u0420\u041E</div>\n                </div>\n            ");
          this.card.querySelector('.card__view').append(_statusEl[0]);
          if (!this.data.image_vertical) this.img.style.display = 'none';
        }
        this.card.addEventListener('hover:focus', function () {
          if (_this.onFocus) _this.onFocus(_this.card, {});
        });
        this.card.addEventListener('hover:touch', function () {
          if (_this.onTouch) _this.onTouch(_this.card, {});
        });
        this.card.addEventListener('visible', this.visible.bind(this));
        this.image();
      }
    }, {
      key: "updateTimeLeft",
      value: function updateTimeLeft() {
        var seconds_left = TimeInstance.left(this.data.time_start);
        this.card.find('.card__promo-text').text(seconds_left > 1000 ? Prisma.Lang.translate('title_left') + ': ' + Prisma.Utils.secondsToTimeHuman(seconds_left / 1000) : Prisma.Lang.translate(seconds_left < -(1000 * 60 * 60 * 4) ? 'broadcast_final_end' : 'broadcast_final_started'));
      }
    }, {
      key: "image",
      value: function image() {
        var _this2 = this;
        this.img.onload = function () {
          _this2.card.classList.add('img--loaded');
        };
        this.img.onerror = function () {
          _this2.img.src = './img/img_broken.svg';
        };
      }
    }, {
      key: "visible",
      value: function visible() {
        var src = this.params.type === 'watch' ? this.data.image_horizontal : this.data.image_vertical;
        src = src ? src : './img/img_load.svg';
        this.img.src = src;
        if (this.onVisible) this.onVisible(this.card, {});
      }
    }, {
      key: "destroy",
      value: function destroy() {
        this.img.onerror = function () {};
        this.img.onload = function () {};
        this.img.src = '';
        this.card.remove();
        this.card = null;
        this.img = null;
        TimeInstance.removeUpdate(this.timeLeft);
      }
    }, {
      key: "render",
      value: function render(js) {
        return js ? this.card : $(this.card);
      }
    }]);
  }();

  function component(object) {
    var comp = new Prisma.InteractionMain(object);
    comp.create = function () {
      var _this = this;
      this.activity.loader(true);
      ApiInstance.get(function (results) {
        _this.activity.loader(false);
        var offset = 1000 * 60 * 60 * 24 * 1;
        var watch = results.filter(function (item) {
          return TimeInstance.left(item.time_start) <= offset || item.status == 'live';
        }).filter(function (item) {
          return TimeInstance.left(item.time_end) > 0 || item.status == 'live';
        });
        var soon = results.filter(function (item) {
          return TimeInstance.left(item.time_start) > offset;
        });
        var data = [];
        if (watch.length) {
          data.push({
            title: Prisma.Lang.translate('broadcast_final_now_watch'),
            nomore: true,
            results: watch.map(function (result) {
              return {
                cardClass: function cardClass() {
                  return new Card(result, {
                    type: 'watch'
                  });
                }
              };
            })
          });
        }
        if (soon.length) {
          data.push({
            title: Prisma.Lang.translate('broadcast_final_soon_watch'),
            nomore: true,
            results: soon.map(function (result) {
              return {
                cardClass: function cardClass() {
                  return new Card(result, {
                    type: 'soon'
                  });
                }
              };
            })
          });
        }
        _this.build(data);
      }, this.empty.bind(this));
      return this.render();
    };
    return comp;
  }

  function startPlugin() {
    Prisma.Template.add('broadcasts_css', "\n    <style>\n    @-webkit-keyframes marker-status-live{0%{-webkit-box-shadow:0 0 0 0 rgba(118,230,122,0.7);box-shadow:0 0 0 0 rgba(118,230,122,0.7);background-color:#76e67a}70%{-webkit-box-shadow:0 0 0 .4em rgba(234,78,78,0);box-shadow:0 0 0 .4em rgba(234,78,78,0);background-color:rgba(255,255,255,0.5)}100%{-webkit-box-shadow:0 0 0 0 rgba(234,78,78,0);box-shadow:0 0 0 0 rgba(234,78,78,0);background-color:rgba(255,255,255,0.4)}}@keyframes marker-status-live{0%{-webkit-box-shadow:0 0 0 0 rgba(118,230,122,0.7);box-shadow:0 0 0 0 rgba(118,230,122,0.7);background-color:#76e67a}70%{-webkit-box-shadow:0 0 0 .4em rgba(234,78,78,0);box-shadow:0 0 0 .4em rgba(234,78,78,0);background-color:rgba(255,255,255,0.5)}100%{-webkit-box-shadow:0 0 0 0 rgba(234,78,78,0);box-shadow:0 0 0 0 rgba(234,78,78,0);background-color:rgba(255,255,255,0.4)}}@-webkit-keyframes marker-status-soon{0%{background-color:rgba(255,255,255,0.7)}65%{background-color:rgba(255,255,255,0.4)}100%{background-color:rgba(255,255,255,0.4)}}@keyframes marker-status-soon{0%{background-color:rgba(255,255,255,0.7)}65%{background-color:rgba(255,255,255,0.4)}100%{background-color:rgba(255,255,255,0.4)}}.broadcast__status{position:absolute;top:1em;right:1em;z-index:10;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center}.broadcast__status-marker{width:.8em;height:.8em;-webkit-border-radius:50%;border-radius:50%;margin-right:.5em}.broadcast__status-text{font-size:1em;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5)}.broadcast__status--live{background-color:rgba(0,0,0,0.6);padding:.4em .8em;-webkit-border-radius:.3em;border-radius:.3em;-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}.broadcast__status--live .broadcast__status-marker{-webkit-animation:marker-status-live 1.5s infinite;animation:marker-status-live 1.5s infinite}.broadcast__status--live .broadcast__status-text{color:#76e67a}.broadcast__status--soon{background-color:rgba(0,0,0,0.6);padding:.4em .8em;-webkit-border-radius:.3em;border-radius:.3em;-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}.broadcast__status--soon .broadcast__status-marker{-webkit-animation:marker-status-soon 3s infinite;animation:marker-status-soon 3s infinite}\n    </style>\n    ");
    $('body').append(Prisma.Template.get('broadcasts_css', {}, true));
    Prisma.Lang.add({
      broadcast_name: {
        ru: 'Спорт',
        uk: 'Спорт',
        en: 'Sport'
      },
      broadcast_title: {
        ru: 'Спортивные трансляции',
        uk: 'Спортивні трансляції',
        en: 'Sports broadcasts'
      },
      broadcast_final_program: {
        ru: 'Программа отсутствует',
        uk: 'Немає програми',
        en: 'No program'
      },
      broadcast_final_bell_60: {
        ru: 'До начала трансляции осталось 60 минут.',
        uk: 'До початку трансляції залишилось 60 хвилин.',
        en: '60 minutes left until the broadcast starts.'
      },
      broadcast_final_bell_10: {
        ru: 'До начала трансляции осталось 10 минут.',
        uk: 'До початку трансляції залишилось 10 хвилин.',
        en: '10 minutes left until the broadcast starts.'
      },
      broadcast_final_start_not_yet: {
        ru: 'Трансляция еще не началась.\nПожалуйста, подождите.',
        uk: 'Трансляція ще не почалася.\nБудь ласка, зачекайте.',
        en: 'The broadcast has not started yet.\nPlease wait.'
      },
      broadcast_final_started: {
        ru: 'Трансляция началась!\nПрисоединяйтесь к просмотру.',
        uk: 'Трансляція почалася!\nПриєднуйтесь до перегляду.',
        en: 'The broadcast has started!\nJoin the viewing.'
      },
      broadcast_final_end: {
        ru: 'Трансляция завершена.',
        uk: 'Трансляція завершена.',
        en: 'The broadcast has ended.'
      },
      broadcast_final_nolink: {
        ru: 'Нет ссылки на трансляцию.',
        uk: 'Немає посилання на трансляцію.',
        en: 'No link to the broadcast.'
      },
      broadcast_final_now_watch: {
        ru: 'Предстоящие трансляции',
        uk: 'Найближчим часом',
        en: 'Coming up soon'
      },
      broadcast_final_soon_watch: {
        ru: 'Скоро в эфире',
        uk: 'Скоро почнеться трансляція',
        en: 'The broadcast will start soon'
      }
    });
    var manifest = {
      type: 'video',
      version: '1.0.2',
      name: Prisma.Lang.translate('broadcast_name'),
      description: '',
      component: 'iptv_broadcasts'
    };
    Prisma.Manifest.plugins = manifest;
    Prisma.Component.add('iptv_broadcasts', component);
    function add() {
      var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <g clip-path=\"url(#clip0_18071_2606)\">\n                    <path d=\"M12.0003 12.0004C13.801 12.0004 15.4905 12.4763 16.95 13.3093M12.0003 12.0004C11.1 13.5598 9.84311 14.785 8.39209 15.6325M12.0003 12.0004C11.1 10.441 10.6674 8.73988 10.659 7.05954M16.95 13.3093C16.7629 13.7116 16.5565 14.1091 16.3305 14.5006C16.1045 14.8921 15.8635 15.2694 15.6087 15.6325C13.5655 18.5436 10.6328 20.5323 7.39909 21.441M16.95 13.3093C18.6587 14.2845 20.052 15.7491 20.939 17.5122M8.39209 15.6325C8.13724 15.2693 7.89622 14.8919 7.67019 14.5004C5.63231 10.9707 5.19204 6.957 6.125 3.29666M8.39209 15.6325C6.69301 16.6248 4.72775 17.0992 2.75714 16.9858M10.659 7.05954C10.6502 5.28516 11.1143 3.53393 12.0003 1.99713C12.0964 1.83032 12.1976 1.66605 12.3036 1.50454M10.659 7.05954C11.1009 7.02039 11.5483 7.00039 12.0003 7.00039C16.0757 7.00039 19.7715 8.62565 22.4749 11.2634M6.125 3.29666C3.33463 5.184 1.50037 8.37791 1.50037 12.0002C1.50037 13.8046 1.95547 15.5026 2.75714 16.9858M6.125 3.29666C7.80174 2.16256 9.82371 1.50024 12.0004 1.50024C12.1018 1.50024 12.2029 1.50168 12.3036 1.50454M12.3036 1.50454C17.7163 1.65803 22.1036 5.90786 22.4749 11.2634M22.4749 11.2634C22.4918 11.5068 22.5004 11.7525 22.5004 12.0002C22.5004 14.0219 21.929 15.9101 20.939 17.5122M20.939 17.5122C19.0892 20.5056 15.7777 22.5002 12.0004 22.5002C10.35 22.5002 8.78855 22.1195 7.39909 21.441M7.39909 21.441C5.42541 20.4773 3.79874 18.9128 2.75714 16.9858\" stroke=\"#F2F2F2\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n                    </g>\n                    <defs>\n                    <clipPath id=\"clip0_18071_2606\">\n                    <rect width=\"24\" height=\"24\" fill=\"currentColor\"/>\n                    </clipPath>\n                    </defs>\n                </svg>\n            </div>\n            </div>\n            <div class=\"menu__text\">".concat(manifest.name, "</div>\n        </li>"));
      button.on('hover:enter', function () {
        Prisma.Activity.push({
          url: '',
          title: Prisma.Lang.translate('broadcast_title'),
          component: 'iptv_broadcasts',
          page: 1
        });
      });
      $('.menu .menu__list').eq(0).append(button);
    }
    if (window.appready) add();else {
      Prisma.Listener.follow('app', function (e) {
        if (e.type == 'ready') add();
      });
    }
    window.iptv_broadcasts_ready = true;
  }
  if (!window.iptv_broadcasts_ready && Prisma.Manifest.app_digital >= 246) startPlugin();

  return startPlugin;

})();
