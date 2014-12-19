var Manipulator = (function() {

	var create = function(img) {

		// data is the object containing both the image information
		// and all methods to manipulate that image. 'data' gets passed
		// around in the 'resolve' function of the promise. 
		var _staging = [];
		var data = {};

		data.append = function(display) {
			document.body.appendChild(data.canvas)
			if (display === false) {
				data.hide();
			}
		}

		data.hide = function() {
			data.canvas.style.display = 'none'
		}

		data.redraw = function(pix) {
			pix = pix || _staging;
			for (var x = 0; x < pix.length; x++) {
				data.imgData.data[x] = ~~(pix[x]);
			}
			data.context.putImageData(data.imgData, 0, 0)
		}

		data.convert = function() {
			data.redraw();
			document.body.removeChild(data.canvas);
			var image = data.canvas.toDataURL("image/png");
			var img = document.createElement('img');
			img.src = image;
			document.body.appendChild(img);
		}

		data.filter = {};

		data.filter.simple = function(pix, func) {
			_simpleLoop(pix, func);
		}

		data.filter.opacity = function(percent, pixels) {
			data.filter.simple(_defaultArray(pixels), function(r, g, b, a) {
				return [r, g, b, a * (percent / 100)];
			});
		}
		data.filter.invert = function(pixels) {
			data.filter.simple(_defaultArray(pixels), function(r, g, b, a) {
				return [255 - r, 255 - g, 255 - b, a];
			});
		}
		data.filter.brighten = function(percent, pixels) {
			data.filter.simple(_defaultArray(pixels), function(r, g, b, a) {
				r = Math.min(255, r * (1 + percent / 100));
				g = Math.min(255, g * (1 + percent / 100));
				b = Math.min(255, b * (1 + percent / 100));
				return [r, g, b, a];
			});
		}
		data.filter.darken = function(percent, pixels) {
			data.filter.simple(_defaultArray(pixels), function(r, g, b, a) {
				r = Math.max(0, r * (1 - percent / 100));
				g = Math.max(0, g * (1 - percent / 100));
				b = Math.max(0, b * (1 - percent / 100));
				return [r, g, b, a];
			});
		}
		data.filter.threshold = function(value, pixels) {
			data.filter.simple(_defaultArray(pixels), function(r, g, b, a) {
				var v = (_grayValue(r, g, b) >= value) ? 255 : 0;
				return [v, v, v, a];
			});
		}
		data.filter.grayscale = function(pixels) {
			data.filter.simple(_defaultArray(pixels), function(r, g, b, a) {
				// CIE luminance for the RGB
				// The human eye is bad at seeing red and blue, so we de-emphasize them.
				// TIL: thanks HTML5rocks.com
				var v = _grayValue(r, g, b);
				return [v, v, v, a];
			});
		}
		data.filter.convolute = function(weights, opaque) {
			return _filterConvolute(_defaultArray(), weights, opaque)
		};

		data.filter.sharpen = function() {
			data.redraw(data.filter.convolute([0, -1, 0, -1, 5, -1, 0, -1, 0]));
		}

		data.filter.blur = function() {
			var n = 1 / 9;
			data.redraw(data.filter.convolute([n, n, n, n, n, n, n, n, n]));
		}

		//todo: this sobel function is an edge detection. replace existing edge
		//detection with this and make sobel function better suitable for actual
		//sobel stuff. 
		data.filter.sobel = function(func, redraw) {
			redraw = redraw || true;
			var pixels = _defaultArray();
			var grayscale = _shallowCopy(_defaultArray());
			data.filter.grayscale(grayscale);

			var vertical = _filterConvoluteFloat(grayscale, [-1, 0, 1, -2, 0, 2, -1, 0, 1]);
			var horizontal = _filterConvoluteFloat(grayscale, [-1, -2, -1, 0, 0, 0, 1, 2, 1]);

			for (var i = 0; i < pixels.length; i += 4) {
				var pix = func(_pixel(pixels, i), _pixel(vertical, i), _pixel(horizontal, i));
				pixels[i + 0] = pix[0];
				pixels[i + 1] = pix[1];
				pixels[i + 2] = pix[2];
				pixels[i + 3] = pix[3];
			}

			if(redraw) {
				data.redraw();
			}
		}

		data.edges = function(edgeColor, pixColor) {
			data.filter.sobel(function(pixel, vertical, horizontal) {
				var v = Math.abs(vertical[0]);
				var h = Math.abs(horizontal[0]);
				if (v > 0 || h > 0) {
					pixel[0] = edgeColor[0]
					pixel[1] = edgeColor[1]
					pixel[2] = edgeColor[2]
					pixel[3] = 255;
				} else {
					if (pixColor) {
						pixel[0] = pixColor[0]
						pixel[1] = pixColor[1]
						pixel[2] = pixColor[2]
					}
				}
				return pixel;
			});
		}

		data.smoothing = function(no, n) {
			n = n || 0;
			var arr = [];
			for (var x = 0; x < data.width; x++) {
				arr[x] = [];
				for (var y = 0; y < data.height; y++) {
					arr[x][y] = _pixel(_defaultArray(), y * data.width * 4 + x * 4)
				}
			}

			var smooths = 0;
			while (smooths++ < no) {
				console.log('> smoothing pass')
				for (x = 1; x < data.width - 1; x++) {
					for (y = 1; y < data.height - 1; y++) {
						var col = arr[x][y];
						var counts = {};
						var max = 0;
						var maxc = null;
						counts[arr[x - 1][y - 1]] = counts[arr[x - 1][y - 1]] ? counts[arr[x - 1][y - 1]] + 1 : 1;
						counts[arr[x - 1][y]] = counts[arr[x - 1][y]] ? counts[arr[x - 1][y]] + 1 : 1;
						counts[arr[x - 1][y + 1]] = counts[arr[x - 1][y + 1]] ? counts[arr[x - 1][y + 1]] + 1 : 1;
						counts[arr[x][y - 1]] = counts[arr[x][y - 1]] ? counts[arr[x][y - 1]] + 1 : 1;
						counts[arr[x][y]] = counts[arr[x][y]] ? counts[arr[x][y]] + 1 : 1;
						counts[arr[x][y + 1]] = counts[arr[x][y + 1]] ? counts[arr[x][y + 1]] + 1 : 1;
						counts[arr[x + 1][y - 1]] = counts[arr[x + 1][y - 1]] ? counts[arr[x + 1][y - 1]] + 1 : 1;
						counts[arr[x + 1][y]] = counts[arr[x + 1][y]] ? counts[arr[x + 1][y]] + 1 : 1;
						counts[arr[x + 1][y + 1]] = counts[arr[x + 1][y + 1]] ? counts[arr[x + 1][y + 1]] + 1 : 1;

						for (var c in counts) {
							if (counts[c] > max) {
								max = counts[c];
								maxc = c;
							}
						}
						if (max >= n) {
							arr[x][y] = maxc.split(',');
						}
					}
				}
			}

			for (var x = 0; x < data.width; x++) {
				for (var y = 0; y < data.height; y++) {
					_staging[y * data.width * 4 + x * 4 + 0] = arr[x][y][0]
					_staging[y * data.width * 4 + x * 4 + 1] = arr[x][y][1]
					_staging[y * data.width * 4 + x * 4 + 2] = arr[x][y][2]
					_staging[y * data.width * 4 + x * 4 + 3] = arr[x][y][3]
				}
			}
		}

		data.kmeans = function(k, colors, redraw) {
			redraw = redraw || true;
			var arr = [];
			for (var x = 0; x < _staging.length; x += 4) {
				arr.push(_pixel(_staging, x));
			}

			var result = [];

			var k = k || 16;
			var regions = [];
			var colors = colors || [];
			var centroids = _randomCentroids(arr, k, colors);

			for (var c = 0; c < centroids.length; c++) {
				regions.push({
					key: centroids[c],
					arr: []
				})
			}

			var done = false;

			while (done === false) {
				console.log('> kmeans pass');
				for (var x = 0; x < arr.length; x++) {
					var min = Infinity;
					var col = null;
					for (var co in regions) {
						var dist = _distance(regions[co].key, arr[x])
						if (dist <= min) {
							min = dist;
							col = co;
						}
					}
					regions[col].arr.push(arr[x])
				}

				newRegion = [];
				for (var c1 in regions) {
					var r = 0,
						g = 0,
						b = 0,
						n = 0;

					for (var x = 0; x < regions[c1].arr.length; x++) {
						var col = regions[c1].arr[x];
						r += col[0];
						g += col[1];
						b += col[2];
						n++;
					}

					var avg = [
						(n === 0) ? 0 : Math.floor(r / n), (n === 0) ? 0 : Math.floor(g / n), (n === 0) ? 0 : Math.floor(b / n),
						255
					];
					var slice = regions[c1].arr.slice(0);
					newRegion.push({
						key: avg,
						arr: []
					});
				}

				var total = 0;
				for (var c2 in regions) {
					if (_arrayEquals(newRegion[c2].key, regions[c2].key)) {
						total++
					}
					//newRegion[c].arr = regions[c].arr.slice(0);
				}
				done = total === k;

				if (done === true) {
					for (var c3 in regions) {
						newRegion[c3].arr = regions[c3].arr.slice(0);
					}
				}
				regions = newRegion;

			}

			for (var x = 0; x < arr.length; x++) {
				var min = Infinity;
				var col = null;
				for (var c4 in regions) {
					var dist = _distance(regions[c4].key, arr[x])
					if (dist <= min) {
						min = dist;
						col = c4;
					}
				}
				var nc = regions[col].key;
				result[x * 4] = nc[0]
				result[x * 4 + 1] = nc[1]
				result[x * 4 + 2] = nc[2]
				result[x * 4 + 3] = nc[3]
			}

			_staging = result;

			return regions;

		}

		data.mergeCells = function(numberOfCellMerges, size) {
			var pix = _staging;
			var width = data.width;
			for (var t = 0; t < numberOfCellMerges; t++) {
				console.log('mergin cells pass');
				var cells = data.divideIntoCells();
				var total = cells.length;
				for (var cell = 0; cell < cells.length; cell++) {
					var c = cells[cell];
					var near = (c.cell[0] - (width * 4) < 0) ? c.cell[0] + 4 : c.cell[0] - (width * 4)
					var prev = _pixel(pix, near);
					for (var p in c.cell) {
						pix[c.cell[p]] = prev[0];
						pix[c.cell[p] + 1] = prev[1];
						pix[c.cell[p] + 2] = prev[2];
					}
					total--;
					if (c.len > size) {
						break;
					}
				}
			}
		}

		data.divideIntoCells = function() {
			var width = data.width;
			var height = data.height;
			var arr = [];
			var done = [];
			var arr = _shallowCopy(_staging);

			for (var x = 0; x < _staging.length; x += 4) {
				done.push(x);
			}
			var cells = [];
			var loop = true;
			while (loop === true) {
				var newCell = null;
				for (var y = 0; y < _staging.length / 4; y++) {
					if (done[y] !== null) {
						newCell = done[y];
						break;
					}
				}
				console.log(' > cell pass');
				if (newCell === null) {
					loop = false;
				}
				var co = _coordinate(newCell, width)
				var color = _pixel(_staging, newCell);
				var r = data.floodFill(co.x, co.y, color[0], color[1], color[2]);
				for (var x = 0; x < r.length; x++) {
					done[r[x] / 4] = null;
				}
				cells.push({
					len: r.length,
					cell: r,
					color: color
				});
				loop = !(r.length === 0 || done.length === 0);
			}
			cells.sort(function(a, b) {
				return (a.len === b.len) ? 0 : (a.len < b.len) ? -1 : 1
			});
			return cells;
		}

		data.floodFill = function(startx, starty, startR, startG, startB) {
			var width = data.width;
			var height = data.height;
			var newPos;
			var x;
			var y;
			var pixelPos;
			var reachLeft;
			var reachRight;
			var pixelStack = [
				[startx, starty]
			];
			var cell = [];

			while (pixelStack.length) {
				var newPos, x, y, pixelPos, reachLeft, reachRight;
				newPos = pixelStack.pop();
				x = newPos[0];
				y = newPos[1];

				pixelPos = (y * width + x) * 4;
				while (y-- >= 0 && matchStartColor(pixelPos, startR, startG, startB)) {
					pixelPos -= width * 4;
				}
				pixelPos += width * 4;
				++y;
				reachLeft = false;
				reachRight = false;
				while (y++ < height - 1 && matchStartColor(pixelPos, startR, startG, startB) && cell.indexOf(pixelPos) === -1) {
					cell.push(pixelPos);
					if (x > 0) {
						if (matchStartColor(pixelPos - 4, startR, startG, startB)) {
							if (!reachLeft) {
								pixelStack.push([x - 1, y]);
								reachLeft = true;
							}
						} else if (reachLeft) {
							reachLeft = false;

						}
					}

					if (x < width - 1) {
						if (matchStartColor(pixelPos + 4, startR, startG, startB)) {
							if (!reachRight) {
								pixelStack.push([x + 1, y]);
								reachRight = true;
							}
						} else if (reachRight) {
							reachRight = false;

						}
					}

					pixelPos += width * 4;
				}
			}

			return cell;

			function matchStartColor(pixelPos, r, g, b) {
				var r = _staging[pixelPos];
				var g = _staging[pixelPos + 1];
				var b = _staging[pixelPos + 2];

				return (r == startR && g == startG && b == startB);
			}
		}


		function Manipulator(img) {
			var self = this;
			var promise = new Promise(function(resolve, reject) {

				var _canvas = document.createElement('canvas');
				var _context = _canvas.getContext('2d');
				var _img = document.createElement('img');

				_img.onload = function() {
					_canvas.width = this.width;
					_canvas.height = this.height;
					_context.drawImage(_img, 0, 0);
					data.width = this.width;
					data.height = this.height;
					data.canvas = _canvas;
					data.context = _context;
					data.imgData = _context.getImageData(0, 0, _canvas.width, _canvas.height)
					_staging = _shallowCopy(data.imgData.data);
					resolve(data);
				}

				_img.src = img;

			});

			return promise;
		}



		/*
			internal functions
		*/
		function _defaultArray(pix) {
			return (pix instanceof Array) ? pix : _staging;
		}

		function _filterConvolute(pixels, weights, opaque) {
			var side = Math.round(Math.sqrt(weights.length));
			var halfSide = Math.floor(side / 2);
			var src = pixels;
			var sw = data.width;
			var sh = data.height;
			// pad output by the convolution matrix
			var w = sw;
			var h = sh;
			var dst = [];
			// go through the destination image pixels
			var alphaFac = opaque ? 1 : 0;
			for (var y = 0; y < h; y++) {
				for (var x = 0; x < w; x++) {
					var sy = y;
					var sx = x;
					var dstOff = (y * w + x) * 4;
					// calculate the weighed sum of the source image pixels that
					// fall under the convolution matrix
					var r = 0,
						g = 0,
						b = 0,
						a = 0;
					for (var cy = 0; cy < side; cy++) {
						for (var cx = 0; cx < side; cx++) {
							var scy = sy + cy - halfSide;
							var scx = sx + cx - halfSide;
							if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
								var srcOff = (scy * sw + scx) * 4;
								var wt = weights[cy * side + cx];
								r += src[srcOff] * wt;
								g += src[srcOff + 1] * wt;
								b += src[srcOff + 2] * wt;
								a += src[srcOff + 3] * wt;
							}
						}
					}
					dst[dstOff] = ~~r;
					dst[dstOff + 1] = ~~g;
					dst[dstOff + 2] = ~~b;
					dst[dstOff + 3] = ~~(a + alphaFac * (255 - a));
				}
			}
			return dst;
		}

		if (!window.Float32Array)
			Float32Array = Array;

		function _filterConvoluteFloat(pixels, weights, opaque) {
			var side = Math.round(Math.sqrt(weights.length));
			var halfSide = Math.floor(side / 2);

			var src = pixels;
			var sw = data.width;
			var sh = data.height;

			var w = sw;
			var h = sh;
			var dst = new Float32Array(w * h * 4);

			var alphaFac = opaque ? 1 : 0;

			for (var y = 0; y < h; y++) {
				for (var x = 0; x < w; x++) {
					var sy = y;
					var sx = x;
					var dstOff = (y * w + x) * 4;
					var r = 0,
						g = 0,
						b = 0,
						a = 0;
					for (var cy = 0; cy < side; cy++) {
						for (var cx = 0; cx < side; cx++) {
							var scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
							var scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
							var srcOff = (scy * sw + scx) * 4;
							var wt = weights[cy * side + cx];
							r += src[srcOff] * wt;
							g += src[srcOff + 1] * wt;
							b += src[srcOff + 2] * wt;
							a += src[srcOff + 3] * wt;
						}
					}
					dst[dstOff] = ~~r;
					dst[dstOff + 1] = ~~g;
					dst[dstOff + 2] = ~~b;
					dst[dstOff + 3] = ~~(a + alphaFac * (255 - a));
				}
			}
			return dst;
		};

		function _pixel(arr, s) {
			return [arr[s], arr[s + 1], arr[s + 2], arr[s + 3]]
		}

		function _randomCentroids(arr, k, colors) {
			var centroids = arr.slice(0); // copy
			centroids.sort(function() {
				return (Math.round(Math.random()) - 0.5);
			});
			var cent = centroids.slice(0, k - colors.length);
			return cent.concat(colors);
			//return centroids.slice(0, k);
		}

		//euclidian distance
		function _distance(c1, c2) {
			var dr = Math.abs(c1[0] - c2[0]);
			var dg = Math.abs(c1[1] - c2[1]);
			var db = Math.abs(c1[2] - c2[2]);
			return Math.sqrt(dr * dr + dg * dg + db * db)
		}


		function _arrayEquals(array1, array2) {
			// if the other array is a falsy value, return
			if (!array1 || !array2)
				return false;

			// compare lengths - can save a lot of time 
			if (array1.length != array2.length)
				return false;

			for (var i = 0, l = array1.length; i < l; i++) {
				// Check if we have nested arrays
				if (array1[i] instanceof Array && array2[i] instanceof Array) {
					// recurse into the nested arrays
					if (!array1[i]._arrayEquals(array2[i]))
						return false;
				} else if (array1[i] != array2[i]) {
					return false;
				}
			}
			return true;
		}

		function _simpleLoop(pix, func) {;
			for (var x = 0; x < pix.length; x += 4) {
				var c = func(pix[x + 0], pix[x + 1], pix[x + 2], pix[x + 3]);
				pix[x + 0] = c[0]
				pix[x + 1] = c[1]
				pix[x + 2] = c[2]
				pix[x + 3] = c[3]
			}
		}

		function _coordinate(pos, width) {
			var x = (pos / 4) % (width)
			var c = {
				x: x,
				y: ((pos / 4) - x) / width
			}
			return c;
		}

		function _grayValue(r, g, b) {
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		}

		function _shallowCopy(arr) {
			var ret = [];
			for (var x = 0; x < arr.length; x++) {
				ret[x] = arr[x];
			}
			return ret;
		}

		function Promise(fn) {

			/**
				Private properties
			*/
			var _data;
			var _deferred;
			var _state = 'pending';
			var _parentData;

			/**
				Private functions
			*/
			function _handle(handler) {
				if (_state === 'pending') {
					_deferred = handler;
					return;
				}

				var handlerCallback = _getCallback(handler);

				setTimeout(function() {
					try {
						if (!handlerCallback) {
							_getPromiseFunction().call(this, _data);
							return;
						}

						handler._resolve.call(this, handlerCallback(_data))
					} catch (e) {
						console.log(e)
						if (handler._reject)
							handler._reject.call(this, e);
						else
							throw e;
					}
				}, 1);

			}

			function _getCallback(handler) {
				return (_state === 'resolved') ? handler.onResolve : handler.onReject;
			}


			function _getPromiseFunction(handler) {
				return (_state === 'resolved') ? handler._resolve : handler._reject;
			}

			function _resolve(args) {
				_set('resolved', args);
			}

			function _reject(args) {
				_set('rejected', args);
			}

			function _set(status, args) {
				_data = args;
				_state = status;

				if (_deferred)
					_handle(_deferred);
			}

			/**
				API, public interface
			*/
			this.status = function() {
				return _state;
			}

			this.then = function(resolve, reject) {
				// "res" is the internal _resolve function
				// "resolve" is the function that'll be used
				// on the values of the promise
				//_parent = this;
				var promise = new Promise(function(res, rej) {
					_handle({
						onResolve: resolve,
						onReject: reject,
						_resolve: res,
						_reject: rej,
					});
				})

				return promise;
			}

			this.catch = function(reject) {

				return this.then(null, reject);
			}

			this.done = function(resolve, reject) {
				this.then(resolve, reject);
			}

			/**
				Kickstarting the promise
			*/
			fn(_resolve, _reject);
		}

		/**
			Static methods
		*/
		Promise.all = function(promises) {
			var count = promises.length;
			var finished = 0;
			var result = [];

			return new Promise(function(resolve, reject) {
				for (var p = 0; p < count; p++) {
					promises[p].then(function(value) {
						finished++;
						result.push(value);
						if (finished === count) {
							try {
								resolve(result)
							} catch (e) {
								reject(e);
							}
						}
					}, function(err) {
						console.log('Errors occured when calling "ALL"', err);
					});
				}
			})
		}

		return new Manipulator(img);
	}

	return create;

})();