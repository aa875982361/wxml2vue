"use strict";
exports.__esModule = true;
exports.FpsHelper = void 0;
/**
 * 统计开始到现在/结束的fps
 */
var FpsHelper = /** @class */ (function () {
    function FpsHelper() {
        this.startTime = 0;
        this.frameCount = 0;
        this.endTime = 0;
        this.tempFrameCount = 0;
        this.tempStartTime = 0;
    }
    /** 更新fps, 回调1秒内的平均fps */
    FpsHelper.prototype.updateFPS = function (onTempFPS) {
        var now = Date.now();
        //更新全局fps记录
        if (this.frameCount == 0) {
            this.startTime = now;
        }
        this.frameCount++;
        this.endTime = now;
        //更新临时fps记录
        this.tempFrameCount++;
        if (this.tempStartTime > 0) {
            var interval = now - this.tempStartTime;
            if (interval > 1000) {
                var fps = Math.round(1000 / (interval / this.tempFrameCount));
                this.tempFrameCount = 0;
                this.tempStartTime = now;
                onTempFPS && onTempFPS(fps);
            }
        }
        else {
            this.tempStartTime = now;
            onTempFPS && onTempFPS(0);
        }
    };
    /** 获得开始到当前的平均fps */
    FpsHelper.prototype.getAverageFps = function () {
        var duration = this.endTime - this.startTime;
        if (duration > 1000) {
            return Math.round((1000 * this.frameCount) / duration);
        }
        return 0;
    };
    /** 重置所有的计算 */
    FpsHelper.prototype.reset = function () {
        this.startTime = 0;
        this.frameCount = 0;
        this.endTime = 0;
        this.tempFrameCount = 0;
        this.tempStartTime = 0;
    };
    /** 执行上报fps */
    FpsHelper.prototype.doReport = function (record, face) {
        if (record === void 0) { record = false; }
        if (face === void 0) { face = false; }
        var duration = this.endTime - this.startTime;
        if (duration > 5000) {
            var fps = Math.round((1000 * this.frameCount) / duration);
            var info = wx.getSystemInfoSync();
            wx.report('skip_fps', {
                fps: fps,
                duration: duration,
                record: record ? 1 : 0,
                face: face ? 1 : 0,
                up_platform: info.platform,
                up_brand: info.brand,
                up_model: info.model,
                up_benchmark: info.benchmarkLevel
            });
            this.reset();
        }
    };
    return FpsHelper;
}());
exports.FpsHelper = FpsHelper;
