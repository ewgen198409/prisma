(function () {
    'use strict';

    function Collection(data) {
      this.data = data;
      function remove(elem) {
        if (elem) elem.remove();
      }
      this.build = function () {
        this.item = Prisma.Template.js('luno_collection');
        this.img = this.item.find('.card__img');
        this.icon = this.item.find('.luno-collection-card__user-icon img');
        this.item.find('.card__title').text(Prisma.Utils.capitalizeFirstLetter(data.title));
        this.item.find('.luno-collection-card__items').text(data.items_count + ' Карточек');
        this.item.find('.luno-collection-card__date').text(Prisma.Utils.parseTime(data.time).full);
        var ratingEl = this.item.find('.luno-collection-card__rating');
        var ratingValueEl = this.item.find('.luno-collection-card__rating-value');
        if (ratingEl && ratingValueEl) {
          if (data.rating && data.rating > 0) {
            ratingValueEl.text(parseFloat(data.rating).toFixed(1));
            var el = ratingEl[0] || ratingEl;
            if (el && el.style) el.style.display = '';
          } else {
            var _el = ratingEl[0] || ratingEl;
            if (_el && _el.style) _el.style.display = 'none';
          }
        }
        this.item.find('.luno-collection-card__views').text(Prisma.Utils.bigNumberToShort(data.views || 0) + ' просмотров');
        this.item.find('.full-review__like-counter').text(Prisma.Utils.bigNumberToShort(data.liked || 0));
        this.item.find('.luno-collection-card__user-name').text(data.username);
        var descEl = this.item.find('.luno-collection-card__description');
        if (descEl) {
          if (data.description && data.description.trim()) {
            descEl.text(data.description);
            var _el2 = descEl[0] || descEl;
            if (_el2 && _el2.style) _el2.style.display = '';
          } else {
            var _el3 = descEl[0] || descEl;
            if (_el3 && _el3.style) _el3.style.display = 'none';
          }
        }
        this.item.addEventListener('visible', this.visible.bind(this));
      };

      /**
       * Загрузить картинку
       */
      this.image = function () {
        var _this = this;
        this.img.onload = function () {
          _this.item.classList.add('card--loaded');
        };
        this.img.onerror = function () {
          _this.img.src = './img/img_broken.svg';
        };
        this.icon.onload = function () {
          _this.item.find('.luno-collection-card__user-icon').classList.add('loaded');
        };
        this.icon.onerror = function () {
          _this.icon.src = './img/img_broken.svg';
        };
      };

      /**
       * Создать
       */
      this.create = function () {
        var _this2 = this;
        this.build();
        this.item.addEventListener('hover:focus', function () {
          if (_this2.onFocus) _this2.onFocus(_this2.item, data);
        });
        this.item.addEventListener('hover:touch', function () {
          if (_this2.onTouch) _this2.onTouch(_this2.item, data);
        });
        this.item.addEventListener('hover:hover', function () {
          if (_this2.onHover) _this2.onHover(_this2.item, data);
        });
        this.item.addEventListener('hover:enter', function () {
          Prisma.Activity.push({
            url: data.id,
            collection: data,
            title: Prisma.Utils.capitalizeFirstLetter(data.title),
            component: 'luno_collections_view',
            page: 1
          });
        });
        this.item.addEventListener('hover:long', function () {
          var items = [];
          var voited = Prisma.Storage.cache('collections_voited', 100, []);
          var rated = Prisma.Storage.cache('collections_rated', 100, []);
          if (!Array.isArray(voited)) voited = [];
          if (!Array.isArray(rated)) rated = [];
          items.push({
            title: 'Подборка ' + data.username,
            user: data.cid
          });
          var collectionId = String(data.id || data._id || '');
          if (voited.indexOf(collectionId) == -1) {
            items.push({
              title: Prisma.Lang.translate('title_like'),
              like: 1
            });
          }
          var hasRated = false;
          if (Array.isArray(rated)) {
            hasRated = rated.indexOf(collectionId) != -1 || rated.indexOf(String(data.id)) != -1 || rated.indexOf(data.id) != -1;
          }
          if (!hasRated) {
            items.push({
              title: Prisma.Lang.translate('title_rating') || 'Рейтинг',
              rating: true
            });
          }
          Prisma.Select.show({
            title: Prisma.Lang.translate('title_action'),
            items: items,
            onSelect: function onSelect(item) {
              Prisma.Controller.toggle('content');
              if (item.user) {
                Prisma.Activity.push({
                  url: 'user_' + item.user,
                  title: 'Подборка ' + data.username,
                  component: 'luno_collections_collection',
                  page: 1
                });
              } else if (item.rating) {
                var ratingItems = [];
                for (var i = 1; i <= 10; i++) {
                  ratingItems.push({
                    title: i,
                    value: i
                  });
                }
                Prisma.Select.show({
                  title: Prisma.Lang.translate('title_rating'),
                  items: ratingItems,
                  onSelect: function onSelect(ratingItem) {
                    Prisma.Controller.toggle('content');
                    Api.rate({
                      id: data.id,
                      rating: ratingItem.value
                    }, function (response) {
                      if (response.success) {
                        var _collectionId = String(data.id);
                        if (rated.indexOf(_collectionId) == -1) {
                          rated.push(_collectionId);
                        }
                        Prisma.Storage.set('collections_rated', rated);
                        if (response.rating) {
                          data.rating = response.rating;
                          var ratingEl = _this2.item.find('.luno-collection-card__rating');
                          var ratingValueEl = _this2.item.find('.luno-collection-card__rating-value');
                          if (ratingEl && ratingValueEl) {
                            ratingValueEl.text(parseFloat(response.rating).toFixed(1));
                            var el = ratingEl[0] || ratingEl;
                            if (el && el.style) el.style.display = '';
                          }
                        }
                        Prisma.Bell.push({
                          text: Prisma.Lang.translate('reactions_thanks')
                        });
                      }
                    });
                  },
                  onBack: function onBack() {
                    Prisma.Controller.toggle('content');
                  }
                });
              } else {
                Api.liked({
                  id: data.id,
                  dir: item.like
                }, function () {
                  var collectionId = String(data.id);
                  if (voited.indexOf(collectionId) == -1) {
                    voited.push(collectionId);
                  }
                  Prisma.Storage.set('collections_voited', voited);
                  data.liked += item.like;
                  _this2.item.find('.full-review__like-counter').text(Prisma.Utils.bigNumberToShort(data.liked));
                  Prisma.Bell.push({
                    text: Prisma.Lang.translate('discuss_voited')
                  });
                });
              }
            },
            onBack: function onBack() {
              Prisma.Controller.toggle('content');
            }
          });
        });
        this.image();
      };

      /**
       * Загружать картинку если видна карточка
       */
      this.visible = function () {
        this.img.src = Prisma.Api.img(data.backdrop_path, 'w500');
        this.icon.src = Prisma.Utils.protocol() + Prisma.Manifest.luno_domain + '/img/profiles/' + data.icon + '.png';
        if (this.onVisible) this.onVisible(this.item, data);
      };

      /**
       * Уничтожить
       */
      this.destroy = function () {
        this.img.onerror = function () {};
        this.img.onload = function () {};
        this.img.src = '';
        remove(this.item);
        this.item = null;
        this.img = null;
      };

      /**
       * Рендер
       * @returns {object}
       */
      this.render = function (js) {
        return js ? this.item : $(this.item);
      };
    }

    var network = new Prisma.Reguest();
    var api_url = Prisma.Utils.protocol() + Prisma.Manifest.luno_domain + '/api/collections/';
    var collections = [{
      hpu: 'user',
      title: 'Личные подборки'
    }, {
      hpu: 'new',
      title: 'Новинки'
    }, {
      hpu: 'top',
      title: 'Самые популярные'
    }, {
      hpu: 'week',
      title: 'Популярные за неделю'
    }, {
      hpu: 'month',
      title: 'Популярные за месяц'
    }, {
      hpu: 'all',
      title: 'Все подборки'
    }];
    function header() {
      var user = Prisma.Storage.get('account', '{}');
      if (!user.token) return false;

      // Получаем ID пользователя из разных возможных мест
      var userId = user.id || user.user_id || user.profile && user.profile.id || null;
      return {
        headers: {
          token: user.token,
          profile: userId
        }
      };
    }
    function main(params, oncomplite, onerror) {
      var user = Prisma.Storage.get('account', '{}');
      var status = new Prisma.Status(collections.length);
      status.onComplite = function () {
        var keys = Object.keys(status.data);
        var sort = collections.map(function (a) {
          return a.hpu;
        });
        if (keys.length) {
          var fulldata = [];
          keys.sort(function (a, b) {
            return sort.indexOf(a) - sort.indexOf(b);
          });
          keys.forEach(function (key) {
            var data = status.data[key];
            data.title = collections.find(function (item) {
              return item.hpu == key;
            }).title;
            data.cardClass = function (elem, param) {
              return new Collection(elem, param);
            };
            fulldata.push(data);
          });
          oncomplite(fulldata);
        } else onerror();
      };

      // Функция для получения ID пользователя
      function getUserId(callback) {
        // Сначала пробуем получить из account_user
        var accountUser = Prisma.Storage.get('account_user', '{}');
        if (accountUser && accountUser._id) {
          callback(accountUser._id.toString());
          return;
        }
        if (accountUser && accountUser.id) {
          callback(accountUser.id.toString());
          return;
        }

        // Пробуем из account объекта
        var userId = user.id || user.user_id || user.profile && user.profile.id;
        if (userId) {
          callback(userId.toString());
          return;
        }

        // Если не нашли, запрашиваем через API
        if (user.token) {
          network.silent(Prisma.Utils.protocol() + Prisma.Manifest.luno_domain + '/api/users/get', function (data) {
            if (data && data.user) {
              var id = data.user._id || data.user.id;
              if (id) {
                Prisma.Storage.set('account_user', JSON.stringify(data.user));
                callback(id.toString());
              } else {
                console.warn('[Collections] User ID not found in API response', data);
                callback(null);
              }
            } else {
              callback(null);
            }
          }, function () {
            callback(null);
          }, false, header());
        } else {
          callback(null);
        }
      }
      collections.forEach(function (item) {
        if (item.hpu == 'user' && !user.token) return status.error();
        if (item.hpu == 'user') {
          // Для пользовательских коллекций получаем ID пользователя
          getUserId(function (userId) {
            if (!userId) {
              console.warn('[Collections] Failed to get user ID');
              return status.error();
            }
            var url = api_url + 'list?cid=' + userId;
            network.silent(url, function (data) {
              data.collection = true;
              data.line_type = 'collection';
              data.category = item.hpu;
              data.cid = userId; // Сохраняем ID пользователя для onMore

              status.append(item.hpu, data);
            }, status.error.bind(status), false, header());
          });
        } else {
          var url = api_url + 'list?category=' + item.hpu;
          network.silent(url, function (data) {
            data.collection = true;
            data.line_type = 'collection';
            data.category = item.hpu;
            status.append(item.hpu, data);
          }, status.error.bind(status), false, header());
        }
      });
    }
    function collection(params, oncomplite, onerror) {
      var url = api_url + 'list?category=' + params.url + '&page=' + params.page;
      if (params.url && params.url.indexOf('user') >= 0) {
        var userId = params.url.split('_').pop();
        if (!userId || userId === 'user') {
          console.warn('[Collections] Invalid user ID in URL:', params.url);
          return onerror();
        }
        url = api_url + 'list?cid=' + userId + '&page=' + params.page;
      }
      network.silent(url, function (data) {
        data.collection = true;
        data.total_pages = data.total_pages || 15;
        // Убеждаемся, что results существует и является массивом
        if (!data.results) {
          data.results = data.items || [];
        }
        if (!Array.isArray(data.results)) {
          data.results = [];
        }
        data.cardClass = function (elem, param) {
          return new Collection(elem, param);
        };
        oncomplite(data);
      }, onerror, false, header());
    }
    function liked(params, callaback) {
      network.silent(api_url + 'liked', callaback, function (a, e) {
        Prisma.Noty.show(network.errorDecode(a, e));
      }, params, header());
    }
    function rate(params, callaback) {
      network.silent(api_url + params.id + '/rate', callaback, function (a, e) {
        Prisma.Noty.show(network.errorDecode(a, e));
      }, {
        rating: params.rating
      }, header());
    }
    function full(params, oncomplite, onerror) {
      network.silent(api_url + 'view/' + params.url + '?page=' + params.page, function (data) {
        data.total_pages = data.total_pages || 15;
        // Убеждаемся, что results существует и является массивом
        if (!data.results) {
          data.results = data.items || [];
        }
        if (!Array.isArray(data.results)) {
          data.results = [];
        }
        oncomplite(data);
      }, onerror, false, header());
    }
    function clear() {
      network.clear();
    }
    var Api = {
      main: main,
      collection: collection,
      full: full,
      clear: clear,
      liked: liked,
      rate: rate
    };

    function component$2(object) {
      var comp = new Prisma.InteractionMain(object);
      comp.create = function () {
        var _this = this;
        this.activity.loader(true);
        Api.main(object, function (data) {
          // Обрабатываем данные перед построением
          var userCategory = data.find(function (item) {
            return item && item.category === 'user';
          });
          if (userCategory && (Array.isArray(userCategory.results) && userCategory.results.length === 0 || !userCategory.results)) {
            // Создаем специальный элемент с сообщением о пустой коллекции
            userCategory.results = [{
              type: 'empty_collection_message',
              is_empty_message: true,
              id: 'empty_collection_message',
              title: 'empty'
            }];
            userCategory.cardClass = function (elem, param) {
              // Создаем специальную карточку с сообщением
              var messageCard = document.createElement('div');
              messageCard.className = 'card luno-collection-empty-message';
              messageCard.innerHTML = "\n                        <div class=\"luno-collection-empty-message__content\">\n                            <div class=\"luno-collection-empty-message__qr\">\n                                <img src=\"./img/qr-luno.svg\" alt=\"QR \u043A\u043E\u0434\">\n                            </div>\n                            <div class=\"luno-collection-empty-message__text-block\">\n                                <div class=\"luno-collection-empty-message__title\">\u0412\u0430\u0448\u0430 \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0430 \u043F\u0443\u0441\u0442\u0430</div>\n                                <div class=\"luno-collection-empty-message__text\">\u0427\u0442\u043E\u0431\u044B \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u0432\u043E\u044E \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0443 \u0438\u043B\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0435\u0451 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0439, \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 <span class=\"luno-collection-empty-message__site\">luno.ws/collections</span> \u0438\u043B\u0438 \u043E\u0442\u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0439\u0442\u0435 QR-\u043A\u043E\u0434.</div>\n                            </div>\n                        </div>\n                    ";

              // Отключаем стандартные обработчики событий для пустого сообщения
              messageCard.style.pointerEvents = 'none';
              messageCard.style.cursor = 'default';
              return {
                create: function create() {},
                render: function render(js) {
                  return js ? messageCard : $(messageCard);
                },
                destroy: function destroy() {
                  if (messageCard && messageCard.parentNode) {
                    messageCard.parentNode.removeChild(messageCard);
                  }
                },
                onEnter: function onEnter() {},
                onFocus: function onFocus() {},
                onHover: function onHover() {},
                onTouch: function onTouch() {},
                onVisible: function onVisible() {}
              };
            };
          }
          _this.build(data);
        }, this.empty.bind(this));
        return this.render();
      };
      comp.onMore = function (data) {
        // Для личных подборок нужно добавить ID пользователя
        var url = data.category;
        if (data.category == 'user' && data.cid) {
          url = data.category + '_' + data.cid;
        }
        Prisma.Activity.push({
          url: url,
          title: data.title,
          component: 'luno_collections_collection',
          page: 1
        });
      };
      return comp;
    }

    function component$1(object) {
      var comp = new Prisma.InteractionCategory(object);
      comp.create = function () {
        var _this = this;
        Api.full(object, function (data) {
          // Убеждаемся, что data имеет правильную структуру для build
          if (!data.results) {
            data.results = data.items || [];
          }
          // Убеждаемся, что results - это массив
          if (!Array.isArray(data.results)) {
            data.results = [];
          }
          _this.build(data);
          var render = comp.render();
          var categoryFull = render.find('.category-full');

          // // Создаем hero-секцию
          // if(data.title || data.description){
          //     let hero = $(`<div class="luno-collection-hero">
          //         <div class="luno-collection-hero__backdrop"></div>
          //         <div class="luno-collection-hero__mask"></div>
          //         <div class="luno-collection-hero__content">
          //             <div class="luno-collection-hero__description"></div>
          //             <div class="luno-collection-hero__meta">
          //                 <span class="luno-collection-hero__items"></span>
          //                 <span class="luno-collection-hero__views"></span>
          //                 <span class="luno-collection-hero__liked"></span>
          //                 <span class="luno-collection-hero__rating"></span>
          //             </div>
          //             <div class="luno-collection-hero__author"></div>
          //         </div>
          //     </div>`)

          //     hero.find('.luno-collection-hero__title').text(Prisma.Utils.capitalizeFirstLetter(data.title || ''))

          //     if(data.description && data.description.trim()){
          //         hero.find('.luno-collection-hero__description').text(data.description).css('display', '')
          //     } else {
          //         hero.find('.luno-collection-hero__description').css('display', 'none')
          //     }

          //     hero.find('.luno-collection-hero__items').text((data.items_count || 0) + ' элементов')

          //     if(data.is_public){
          //         hero.find('.luno-collection-hero__views').text((data.views || 0) + ' просмотров').css('display', '')
          //         hero.find('.luno-collection-hero__liked').text((data.liked || 0) + ' лайков').css('display', '')

          //         if(data.rating && data.rating > 0){
          //             hero.find('.luno-collection-hero__rating').text('⭐ Рейтинг: ' + parseFloat(data.rating).toFixed(1)).css('display', '')
          //         } else {
          //             hero.find('.luno-collection-hero__rating').css('display', 'none')
          //         }
          //     } else {
          //         hero.find('.luno-collection-hero__views, .luno-collection-hero__liked, .luno-collection-hero__rating').css('display', 'none')
          //     }

          //     if(data.username && data.cid){
          //         let author = $(`<div class="luno-collection-hero__author-link">
          //             <div class="luno-collection-hero__author-icon">
          //                 <img src="${Prisma.Utils.protocol() + Prisma.Manifest.pris_domain + '/img/profiles/' + (data.icon || 'l_1') + '.png'}" 
          //                      onerror="this.style.display='none'">
          //             </div>
          //             <span class="luno-collection-hero__author-name">${data.username}</span>
          //         </div>`)
          //         hero.find('.luno-collection-hero__author').append(author).css('display', '')
          //     } else {
          //         hero.find('.luno-collection-hero__author').css('display', 'none')
          //     }

          //     // Устанавливаем фон
          //     if(data.backdrop_path && data.backdrop_path !== '/default-collection-backdrop.jpg'){
          //         hero.find('.luno-collection-hero__backdrop').css({
          //             'background-image': `url(${Prisma.Api.img(data.backdrop_path, 'w1280')})`
          //         })
          //     } else {
          //         hero.find('.luno-collection-hero__backdrop').css({
          //             'background-image': 'url(./img/collection-placeholder.svg)',
          //             'background-size': 'cover',
          //             'background-position': 'center'
          //         })
          //     }

          //     categoryFull.before(hero)
          // }

          categoryFull.addClass('mapping--grid cols--6');
        }, this.empty.bind(this));
      };
      comp.nextPageReuest = function (object, resolve, reject) {
        Api.full(object, resolve.bind(comp), reject.bind(comp));
      };
      comp.cardRender = function (object, element, card) {
        card.onMenu = false;
        card.onEnter = function () {
          // Определяем тип медиа на основе данных элемента
          // Приоритет: media_type > type > проверка полей сериала
          var mediaType = 'movie';

          // Сначала проверяем явные поля типа
          if (element.media_type === 'tv' || element.type === 'tv') {
            mediaType = 'tv';
          }
          // Затем проверяем признаки сериала
          else if (element.name || element.number_of_seasons || element.episodes || element.seasons || element.first_air_date) {
            mediaType = 'tv';
          }

          // Убеждаемся, что element содержит правильный тип для pushState
          // В pushState используется card.name для определения типа, поэтому для сериалов нужно установить name
          // Создаем копию элемента, чтобы не изменять оригинал
          var cardData = {};
          for (var key in element) {
            if (element.hasOwnProperty(key)) {
              cardData[key] = element[key];
            }
          }

          // Для сериалов убеждаемся, что есть поле name (используется в pushState для определения типа)
          if (mediaType === 'tv' && !cardData.name) {
            cardData.name = element.title || element.name || '';
          }

          // Убеждаемся, что есть source
          if (!cardData.source) {
            cardData.source = 'tmdb';
          }
          Prisma.Activity.push({
            id: element.id,
            url: element.url || element.id,
            component: 'full',
            method: mediaType,
            card: cardData,
            source: cardData.source || 'tmdb'
          });
        };
      };
      return comp;
    }

    function component(object) {
      var comp = new Prisma.InteractionCategory(object);
      comp.create = function () {
        Api.collection(object, this.build.bind(this), this.empty.bind(this));
      };
      comp.nextPageReuest = function (object, resolve, reject) {
        Api.collection(object, resolve.bind(comp), reject.bind(comp));
      };
      comp.cardRender = function (object, element, card) {
        card.onMenu = false;
        card.onEnter = function () {
          Prisma.Activity.push({
            url: element.id,
            title: element.title,
            component: 'luno_collections_view',
            page: 1
          });
        };
      };
      return comp;
    }

    function startPlugin() {
      var manifest = {
        type: 'video',
        component: 'luno_collections'
      };
      Prisma.Manifest.plugins = manifest;
      Prisma.Component.add('luno_collections_main', component$2);
      Prisma.Component.add('luno_collections_collection', component);
      Prisma.Component.add('luno_collections_view', component$1);
      Prisma.Template.add('luno_collection', "<div class=\"card luno-collection-card selector layer--visible layer--render card--collection\">\n        <div class=\"card__view\">\n            <img src=\"./img/img_load.svg\" class=\"card__img\">\n            <div class=\"luno-collection-card__content\">\n                <div class=\"luno-collection-card__head\">\n                    <div class=\"luno-collection-card__items\"></div>\n                    <div class=\"luno-collection-card__date\"></div>\n                </div>\n                <div class=\"luno-collection-card__info\">\n                    <div class=\"luno-collection-card__meta\">\n                        <div class=\"luno-collection-card__rating\">\n                            <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\">\n                                <path opacity=\"0.5\" d=\"M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z\" fill=\"#FFD500\"/>\n                                <path d=\"M10.4127 8.49812L10.5766 8.20419C11.2099 7.06807 11.5266 6.5 12 6.5C12.4734 6.5 12.7901 7.06806 13.4234 8.20419L13.5873 8.49813C13.7672 8.82097 13.8572 8.98239 13.9975 9.0889C14.1378 9.19541 14.3126 9.23495 14.6621 9.31402L14.9802 9.38601C16.2101 9.66428 16.825 9.80341 16.9713 10.2739C17.1176 10.7443 16.6984 11.2345 15.86 12.215L15.643 12.4686C15.4048 12.7472 15.2857 12.8865 15.2321 13.0589C15.1785 13.2312 15.1965 13.4171 15.2325 13.7888L15.2653 14.1272C15.3921 15.4353 15.4554 16.0894 15.0724 16.3801C14.6894 16.6709 14.1137 16.4058 12.9622 15.8756L12.6643 15.7384C12.337 15.5878 12.1734 15.5124 12 15.5124C11.8266 15.5124 11.663 15.5878 11.3357 15.7384L11.0378 15.8756C9.88633 16.4058 9.31059 16.6709 8.92757 16.3801C8.54456 16.0894 8.60794 15.4353 8.7347 14.1272L8.76749 13.7888C8.80351 13.4171 8.82152 13.2312 8.76793 13.0589C8.71434 12.8865 8.59521 12.7472 8.35696 12.4686L8.14005 12.215C7.30162 11.2345 6.88241 10.7443 7.02871 10.2739C7.17501 9.80341 7.78994 9.66427 9.01977 9.38601L9.33794 9.31402C9.68743 9.23495 9.86217 9.19541 10.0025 9.0889C10.1428 8.98239 10.2328 8.82097 10.4127 8.49812Z\" fill=\"#FFD500\"/>\n                            </svg>\n                            <span class=\"luno-collection-card__rating-value\"></span>\n                        </div>\n                        <div class=\"luno-collection-card__views\"></div>\n                        <div class=\"luno-collection-card__user\">\n                            <div class=\"luno-collection-card__user-icon\">\n                                <img >\n                            </div>\n                            <div class=\"luno-collection-card__user-name\"></div>\n                        </div>\n                        <div class=\"luno-collection-card__liked\">\n                            <div class=\"full-review__like-icon\">\n                                <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\">\n                                    <path d=\"M17 2C15.0413 2 13.2705 2.80444 12 4.10095C10.7296 2.80457 8.95874 2 7 2C3.13403 2 0 5.13403 0 9C0 12.866 4 16 12 22C20 16 24 12.866 24 9C24 5.13403 20.866 2 17 2Z\" fill=\"#E32402\"/>\n                                </svg>\n                            </div>\n                            <div class=\"full-review__like-counter\"></div>\n                        </div>\n                    </div>\n                    <div class=\"luno-collection-card__description\"></div>\n                </div>\n            </div>\n        </div>\n        <div class=\"card__title\"></div>\n    </div>");
      var style = "\n        <style>\n        .luno-collection-card__content{position:absolute;bottom:0;left:0;width:100%;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0)),to(rgba(0,0,0,0.85)));background:-webkit-linear-gradient(top,rgba(0,0,0,0) 0,rgba(0,0,0,0.85) 100%);background:-o-linear-gradient(top,rgba(0,0,0,0) 0,rgba(0,0,0,0.85) 100%);background:linear-gradient(180deg,rgba(0,0,0,0) 0,rgba(0,0,0,0.85) 100%);padding-top:2em}.luno-collection-card__head{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-webkit-justify-content:space-between;-ms-flex-pack:justify;justify-content:space-between;padding:0 1em .5em 1em;color:#fff;font-size:1em;font-weight:500}.luno-collection-card__info{padding:.5em 1em 1em 1em}.luno-collection-card__meta{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:1em;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap;margin-bottom:.75em;font-size:.9em;color:rgba(255,255,255,0.9)}.luno-collection-card__rating{font-weight:600;color:#ffd700;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center}.luno-collection-card__rating svg{width:24px;height:24px;display:inline-block;vertical-align:middle;margin-right:.3em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.luno-collection-card__rating-value{display:inline-block}.luno-collection-card__views{color:rgba(255,255,255,0.8)}.luno-collection-card__user{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:.5em;margin-left:auto}.luno-collection-card__user-name{color:rgba(255,255,255,0.9);font-weight:500}.luno-collection-card__user-icon{width:1.8em;height:1.8em;-webkit-border-radius:100%;border-radius:100%;background-color:#fff;border:.15em solid rgba(255,255,255,0.3);-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;overflow:hidden}.luno-collection-card__user-icon img{width:100%;height:100%;-webkit-border-radius:100%;border-radius:100%;opacity:0;-o-object-fit:cover;object-fit:cover}.luno-collection-card__user-icon.loaded img{opacity:1}.luno-collection-card__liked{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:.3em}.luno-collection-card__liked .full-review__like-icon{width:1.2em;height:1.2em;color:rgba(255,255,255,0.9)}.luno-collection-card__liked .full-review__like-counter{font-weight:600;color:rgba(255,255,255,0.9)}.luno-collection-card__description{font-size:1.2em;color:rgba(255,255,255,0.75);line-height:1.4;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;margin-top:.5em}.luno-collection-card__items{background:rgba(0,0,0,0.5);padding:.3em .6em;-webkit-border-radius:.3em;border-radius:.3em;font-weight:600}.luno-collection-card__date{font-size:.85em;opacity:.8}.category-full{margin-top:-0.5rem !important;padding-top:0 !important}.luno-collection-hero:first-child{margin-top:-2em !important}@media screen and (max-width:480px){.luno-collection-hero:first-child{margin-top:-1em !important}}.category-full .luno-collection-card{padding-bottom:2em}body.glass--style .luno-collection-card__bottom,body.glass--style .luno-collection-card__items{background-color:rgba(0,0,0,0.3);-webkit-backdrop-filter:blur(1.6em);backdrop-filter:blur(1.6em)}body.light--version .luno-collection-card__bottom{-webkit-border-radius:0;border-radius:0}@media screen and (max-width:767px){.category-full .luno-collection-card{width:33.3%}}@media screen and (max-width:580px){.category-full .luno-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version .category-full .luno-collection-card{width:33.3%}}@media screen and (max-width:580px){body.light--version .category-full .luno-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version.size--bigger .category-full .luno-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version .category-full .card-back,body.light--version .category-full .card-more,body.light--version .items-cards:has(.luno-collection-card) .card-back,body.light--version .items-cards:has(.luno-collection-card) .card-more{width:21.3%}}@media screen and (max-width:580px){body.light--version .category-full .card-back,body.light--version .category-full .card-more,body.light--version .items-cards:has(.luno-collection-card) .card-back,body.light--version .items-cards:has(.luno-collection-card) .card-more{width:50%}}@media screen and (min-width:767px){body.size--bigger .category-full .card-back,body.size--bigger .category-full .card-more,body.size--bigger .items-cards:has(.luno-collection-card) .card-back,body.size--bigger .items-cards:has(.luno-collection-card) .card-more{font-size:1.14em}}.luno-collection-hero{position:relative;min-height:400px;overflow:hidden;margin-top:0 !important;margin-bottom:-6 !important;padding-top:0 !important;background:-webkit-linear-gradient(315deg,rgba(26,26,27,0.9) 0,rgba(12,12,18,0.9) 100%);background:-o-linear-gradient(315deg,rgba(26,26,27,0.9) 0,rgba(12,12,18,0.9) 100%);background:linear-gradient(135deg,rgba(26,26,27,0.9) 0,rgba(12,12,18,0.9) 100%);background-size:cover;background-position:center;visibility:visible !important;display:block !important;opacity:1 !important;-webkit-transform:none !important;-ms-transform:none !important;transform:none !important;width:100%;-webkit-box-sizing:border-box;box-sizing:border-box}.luno-collection-hero__backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background-size:cover;background-position:center;z-index:0}.luno-collection-hero__mask{position:absolute;top:0;left:0;width:100%;height:100%;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0.2)),color-stop(50%,rgba(0,0,0,0.5)),to(#000));background:-webkit-linear-gradient(top,rgba(0,0,0,0.2) 0,rgba(0,0,0,0.5) 50%,#000 100%);background:-o-linear-gradient(top,rgba(0,0,0,0.2) 0,rgba(0,0,0,0.5) 50%,#000 100%);background:linear-gradient(180deg,rgba(0,0,0,0.2) 0,rgba(0,0,0,0.5) 50%,#000 100%);z-index:1}.luno-collection-hero__content{position:relative;z-index:2;padding:3rem 2rem;padding-bottom:3rem;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;gap:1rem}.luno-collection-hero__title{font-size:3rem;font-weight:700;color:rgba(255,255,255,0.95);margin:0;text-shadow:0 2px 8px rgba(0,0,0,0.8),0 4px 16px rgba(0,0,0,0.6)}.luno-collection-hero__description{font-size:1.3rem;color:rgba(255,255,255,0.9);margin:0;max-width:800px;line-height:1.6;text-shadow:0 1px 4px rgba(0,0,0,0.8),0 2px 8px rgba(0,0,0,0.6)}.luno-collection-hero__meta{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;gap:1.5rem;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;font-size:.95rem;color:rgba(255,255,255,0.85);margin-top:.5rem;text-shadow:0 1px 3px rgba(0,0,0,0.8)}.luno-collection-hero__items,.luno-collection-hero__views,.luno-collection-hero__liked{font-weight:500}.luno-collection-hero__rating{font-weight:600;color:#ffd700;text-shadow:0 1px 3px rgba(0,0,0,0.9)}.luno-collection-hero__author{margin-top:1rem}.luno-collection-hero__author-link{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:.75rem;text-decoration:none;color:rgba(255,255,255,0.9);-webkit-transition:color 200ms;-o-transition:color 200ms;transition:color 200ms;padding:.5rem 1rem;-webkit-border-radius:200px;border-radius:200px;background:rgba(0,0,0,0.4);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);-webkit-box-shadow:0 2px 8px rgba(0,0,0,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.3);width:-webkit-fit-content;width:-moz-fit-content;width:fit-content}.luno-collection-hero__author-icon{width:2rem;height:2rem;-webkit-border-radius:50%;border-radius:50%;-o-object-fit:cover;object-fit:cover;border:1px solid rgba(255,255,255,0.2);overflow:hidden;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.luno-collection-hero__author-icon img{width:100%;height:100%;-o-object-fit:cover;object-fit:cover}.luno-collection-hero__author-name{font-size:.9rem;font-weight:500;-webkit-transition:color 200ms;-o-transition:color 200ms;transition:color 200ms}@media screen and (max-width:768px){.luno-collection-hero{min-height:300px}.luno-collection-hero__content{padding:2rem 1.5rem}.luno-collection-hero__title{font-size:2rem}.luno-collection-hero__description{font-size:1rem}.luno-collection-hero__meta{font-size:.85rem;gap:1rem}}.luno-collection-empty-message{width:100% !important;max-width:100% !important;padding:2rem;-webkit-box-sizing:border-box;box-sizing:border-box;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-ms-flex-pack:center;justify-content:center;min-height:200px;margin:0;background:transparent !important;border:none !important}.luno-collection-empty-message__content{max-width:800px;width:100%;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:2rem;padding:2rem;background:rgba(0,0,0,0.3);-webkit-border-radius:1rem;border-radius:1rem;border:1px solid rgba(255,255,255,0.1)}.luno-collection-empty-message__qr{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:150px;height:150px;padding:1rem;background:rgba(255,255,255,0.1);-webkit-border-radius:1rem;border-radius:1rem;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-ms-flex-pack:center;justify-content:center}.luno-collection-empty-message__qr img{width:100%;height:100%;display:block;-o-object-fit:contain;object-fit:contain}.luno-collection-empty-message__text-block{-webkit-box-flex:1;-webkit-flex:1;-ms-flex:1;flex:1;text-align:left}.luno-collection-empty-message__title{font-size:1.5rem;font-weight:600;color:rgba(255,255,255,0.95);margin-bottom:1rem}.luno-collection-empty-message__text{font-size:1rem;color:rgba(255,255,255,0.8);line-height:1.6}.luno-collection-empty-message__site{background:rgba(22,50,61,0.3);display:inline-block;padding:.1em .4em;-webkit-border-radius:.3em;border-radius:.3em;color:#90ffd4}@media screen and (max-width:768px){.luno-collection-empty-message{padding:1.5rem}.luno-collection-empty-message__content{-webkit-box-orient:vertical;-webkit-box-direction:normal;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;gap:1.5rem;padding:1.5rem;text-align:center}.luno-collection-empty-message__qr{width:120px;height:120px}.luno-collection-empty-message__text-block{text-align:center}.luno-collection-empty-message__title{font-size:1.25rem}.luno-collection-empty-message__text{font-size:.9rem}}.items-line:has(.luno-collection-empty-message) .items-line__body{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-pack:center;-webkit-justify-content:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center}\n        </style>\n    ";
      Prisma.Template.add('luno_collections_css', style);
      $('body').append(Prisma.Template.get('luno_collections_css', {}, true));

    }
    if (!window.luno_collections_ready && Prisma.Manifest.app_digital >= 242) startPlugin();

})();
