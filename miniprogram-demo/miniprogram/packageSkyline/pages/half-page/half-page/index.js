"use strict";
exports.__esModule = true;
// index.js
var common_1 = require("../../../common/custom-route/common");
var comment_1 = require("../../../utils/comment");
var app = getApp();
var windowHeight = app.globalData.windowHeight;
Page({
    data: {
        list: comment_1.getCommentList() //new Array(40).fill(1),
    },
    onLoad: function () {
        var _a;
        this.setData({
            renderer: this.renderer
        });
        this._useWorklet = this.renderer === 'skyline' && !!wx.worklet;
        if (this._useWorklet) {
            this.customRouteContext = (_a = wx.router) === null || _a === void 0 ? void 0 : _a.getRouteContext(this);
            this.scrollTop = wx.worklet.shared(0);
            this.startPan = wx.worklet.shared(false);
            wx.setNavigationBarColor({
                frontColor: '#ffffff',
                backgroundColor: '#000000',
                duration: 300
            });
        }
    },
    onUnload: function () {
        wx.setNavigationBarColor({
            frontColor: '#000000',
            backgroundColor: '#ffffff',
            duration: 300
        });
    },
    back: function () {
        wx.navigateBack({
            delta: 1
        });
    },
    shouldPanResponse: function () {
        'worklet';
        return this.startPan.value;
    },
    shouldScrollViewResponse: function (pointerEvent) {
        'worklet';
        var primaryAnimation = this.customRouteContext.primaryAnimation;
        if (primaryAnimation.value < 1)
            return false;
        var scrollTop = this.scrollTop.value;
        var deltaY = pointerEvent.deltaY;
        var result = !(scrollTop <= 0 && deltaY > 0);
        this.startPan.value = !result;
        return result;
    },
    adjustDecelerationVelocity: function (velocity) {
        'worklet';
        var scrollTop = this.scrollTop.value;
        return scrollTop <= 0 ? 0 : velocity;
    },
    handleScroll: function (event) {
        'worklet';
        if (!this._useWorklet)
            return;
        this.scrollTop.value = event.detail.scrollTop;
    },
    handleDragStart: function () {
        'worklet';
        this.startPan.value = true;
        var startUserGesture = this.customRouteContext.startUserGesture;
        startUserGesture();
    },
    handleDragUpdate: function (delta) {
        'worklet';
        var primaryAnimation = this.customRouteContext.primaryAnimation;
        var newVal = primaryAnimation.value - delta;
        primaryAnimation.value = common_1.clamp(newVal, 0.0, 1.0);
    },
    handleDragEnd: function (velocity) {
        'worklet';
        this.startPan.value = false;
        var _a = this.customRouteContext, primaryAnimation = _a.primaryAnimation, stopUserGesture = _a.stopUserGesture, didPop = _a.didPop;
        var animateForward = false;
        if (Math.abs(velocity) >= common_1._kMinFlingVelocity) {
            animateForward = velocity <= 0;
        }
        else {
            animateForward = primaryAnimation.value > 0.7;
        }
        var t = primaryAnimation.value;
        var animationCurve = common_1.Curves.fastLinearToSlowEaseIn;
        if (animateForward) {
            var droppedPageForwardAnimationTime = Math.min(Math.floor(common_1.lerp(common_1._kMaxDroppedSwipePageForwardAnimationTime, 0, t)), common_1._kMaxPageBackAnimationTime);
            primaryAnimation.value = common_1.timing(1.0, {
                duration: droppedPageForwardAnimationTime,
                easing: animationCurve
            }, function () {
                'worklet';
                stopUserGesture();
            });
        }
        else {
            var droppedPageBackAnimationTime = Math.floor(common_1.lerp(0, common_1._kMaxDroppedSwipePageForwardAnimationTime, t));
            primaryAnimation.value = common_1.timing(0.0, {
                duration: droppedPageBackAnimationTime,
                easing: animationCurve
            }, function () {
                'worklet';
                stopUserGesture();
                didPop();
            });
        }
    },
    handleVerticalDrag: function (gestureEvent) {
        'worklet';
        if (gestureEvent.state === common_1.GestureState.BEGIN) {
            this.handleDragStart();
        }
        else if (gestureEvent.state === common_1.GestureState.ACTIVE) {
            var delta = gestureEvent.deltaY / windowHeight;
            this.handleDragUpdate(delta);
        }
        else if (gestureEvent.state === common_1.GestureState.END) {
            var velocity = gestureEvent.velocityY / windowHeight;
            this.handleDragEnd(velocity);
        }
        else if (gestureEvent.state === common_1.GestureState.CANCELLED) {
            this.handleDragEnd(0.0);
        }
    }
});
