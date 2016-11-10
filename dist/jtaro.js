/*! JTaro.js v0.1.0 ~ (c) 2016 Author:BarZu Git:https://github.com/chjtx/JTaro */
/* global define, Vue */
;(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory()
  : typeof define === 'function' && define.amd ? define(factory)
  : (global.JTaro = factory())
}(this, function () {
  'use strict'

  // 创建样式
  var style = document.getElementById('jtaro_style')
  if (!style) {
    style = document.createElement('style')
    style.id = 'jtaro_style'
    style.innerHTML = 'html,body{height:100%;padding:0;margin:0}#jtaro_app{position:relative;width:100%;height:100%;overflow:hidden}.jtaro-view{position:absolute;width:100%;height:100%;overflow:hidden;background:#fff}'
    document.head.appendChild(style)
  }

  var NotFound = { template: '<div style="text-align:center;padding-top:100px">404 Page not found</div>' }

  var WIDTH = window.innerWidth

  var JTaro = Object.create(null)

  JTaro.params = null
  JTaro.views = []
  JTaro.version = '0.1.0'

  // beforeEnter路由勾子
  function beforeEnterHook (viewCompoent, callback) {
    var beforeEnter = Vue.options.components[viewCompoent.jtaro_tag].options.beforeEnter
    var syncForward
    if (typeof beforeEnter === 'function') {
      syncForward = beforeEnter.call(viewCompoent, function (asynForward) {
        if (asynForward === false) {
          JTaro.go(-1)
        } else {
          callback()
        }
      })
      if (syncForward === true) {
        callback()
      } else if (syncForward === false) {
        JTaro.go(-1)
      }
    } else {
      callback()
    }
  }

  // 页面切入动画（新增页面）
  function slideIn (viewCompoent, el, _jroll) {
    var preSib = el.previousElementSibling

    _jroll.utils.moveTo(el, WIDTH, 0)

    function doSlide () {
      JTaro.sliding = true
      setTimeout(function () {
        // 收入当前页
        if (preSib) {
          _jroll.utils.moveTo(preSib, -WIDTH, 0, 300, function () {
            // 将当前页的上一页隐藏，保持只有两个页面为display:block
            var preSibSib = preSib.previousElementSibling
            if (preSibSib) {
              preSibSib.style.display = 'none'
            }
          })
        }

        // 滑进新建页
        _jroll.utils.moveTo(el, 0, 0, 300, function () {
          JTaro.sliding = false
        })
      }, 0)
    }

    // beforeEnter hook
    beforeEnterHook(viewCompoent, doSlide)
  }

  // 页面切出动画（删除页面）
  function slideOut (el, _jroll, cb) {
    var nxtSib = el.nextElementSibling
    JTaro.sliding = true

    // 撤出当前页
    if (nxtSib) {
      _jroll.utils.moveTo(nxtSib, WIDTH, 0, 300, cb)
    }

    // 滑出上一页
    _jroll.utils.moveTo(el, 0, 0, 300, function () {
      JTaro.sliding = false
      // 将上一页的上一页显示，保持有两个页面为display:block
      var preSib = el.previousElementSibling
      if (preSib) {
        preSib.style.display = 'block'
      }
    })
  }

  // 递归删除页面
  function recursionDelPage (views, children, _jroll, i) {
    var l = views.length
    if (l - 1 > i) {
      slideOut(children[l - 2], _jroll, function () {
        views.splice(l - 1)
        children[l - 1].parentNode.removeChild(children[l - 1])
        setTimeout(function () {
          recursionDelPage(views, children, _jroll, i)
        }, 0)
      })
    }
  }

  function parseUrlParams (a) {
    var p = a.split('&')
    var o = {}
    p.forEach(function (i) {
      var t = i.split('=')
      o[t[0]] = t[1]
    })
    return o
  }

  function findVueComponent (_hash) {
    var children = JTaro.vm.$children
    var i = 0
    var l = children.length
    for (; i < l; i++) {
      if (children[i].jtaro_tag === _hash) {
        return children[i]
      }
    }
  }

  /* 删除或添加页面
   * 1、与路由对应页面不存在->添加
   * 2、与路由对应页面已存在->将该页面往后的所有页面都删除
   */
  function pushView (_hash, _jroll) {
    var h = _hash.replace('#!', '')
    var c

    // 截取url参数
    var p = h.split('?')
    h = p[0]
    if (p[1]) {
      JTaro.params = parseUrlParams(p[1])
    }

    var v = JTaro.vm.$data.views
    var i = JTaro.views.indexOf(h)

    if (i === -1) {
      if (v.indexOf(h) === -1) {
        v.push(h)
      } else {
        c = findVueComponent(h)
        JTaro.vm.$el.appendChild(c.$el)
        slideIn(c, c.$el, _jroll)
      }
      JTaro.views.push(h)
    } else {
      recursionDelPage(JTaro.views, JTaro.vm.$el.childNodes, _jroll, i)
    }
  }

  function reset () {
    WIDTH = window.innerWidth
  }

  // Vue install
  JTaro.install = function (Vue, options) {
    // 页面组件
    var JTaroView = {
      props: ['view'],
      data: function () {
        return {
          jtaro_tag: this.view
        }
      },
      render: function (h) {
        return h(Vue.options.components[this.view] || NotFound)
      },
      mounted: function () {
        slideIn(this, this.$el, options.jroll)
      }
    }

    Vue.component('jt-view', JTaroView)

    // 注册postMessage方法
    Vue.prototype.postMessage = function (msg, name) {
      var view = findVueComponent(name)
      var component = Vue.options.components[name]
      var method = component ? component.options.onMessage : null
      if (view && method) {
        method.call(view.$children[0], { message: msg, origin: this.$parent.jtaro_tag })
      }
    }

    JTaro.vm = new Vue({
      el: options.el,
      data: {
        views: []
      },
      template: '<div id="jtaro_app"><jt-view class="jtaro-view" v-for="view in views" :view="view"></jt-view></div>'
    })

    // 监听路由变化
    window.addEventListener('hashchange', function () {
      pushView(window.location.hash, options.jroll)
    })
    // 页面宽度改变更新动画宽度
    window.addEventListener('resize', reset)
    window.addEventListener('orientationchange', reset)

    // 启动，跳到默认路由
    JTaro.boot = function (page) {
      var hash = window.location.hash
      if (hash === '') {
        window.location.hash = page ? '!' + page : '!home'
      } else {
        pushView(hash, options.jroll)
      }
    }
  }

  // 跳到路由
  JTaro.go = function (route, options) {
    // 页面切换过程中不执行路由跳转
    if (!JTaro.sliding) {
      if (typeof route === 'string') {
        window.location.hash = '!' + route
      }
      if (typeof route === 'number') {
        window.history.go(route)
      }
      if (options) {
        JTaro.params = options
      } else {
        JTaro.params = null
      }
    }
  }

  if (window.Vue && window.JRoll) {
    window.Vue.use(JTaro, {
      jroll: window.JRoll,
      el: '#jtaro_app'
    })
  }

  return JTaro
}))