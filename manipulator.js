var Manipulator = (function() {

	var create = function(img) {
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
			for (var x = 0; x < pix.length; x++) {
				data.imgData.data[x] = pix[x];
			}
			data.context.putImageData(data.imgData, 0, 0)
		}

		data.convert = function() {
			document.body.removeChild(data.canvas);
			var image = data.canvas.toDataURL("image/png");
			var img = document.createElement('img');
			img.src = image;
			document.body.appendChild(img);
		}

		data.smoothing = function(no, n, redraw) {
			redraw = redraw || true;
			n = n || 0;
			var arr = [];
			var result = [];
			for (var x = 0; x < data.width; x++) {
				arr[x] = [];
				for (var y = 0; y < data.height; y++) {
					arr[x][y] = pixel(data.imgData.data, y * data.width * 4 + x * 4)
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
					result[y * data.width * 4 + x * 4 + 0] = arr[x][y][0]
					result[y * data.width * 4 + x * 4 + 1] = arr[x][y][1]
					result[y * data.width * 4 + x * 4 + 2] = arr[x][y][2]
					result[y * data.width * 4 + x * 4 + 3] = arr[x][y][3]
				}
			}

			if (redraw === true) {
				data.redraw(result);
			}

			return result;
		}

		data.kmeans = function(k, colors, redraw) {
			redraw = redraw || true;
			var arr = [];
			for (var x = 0; x < data.imgData.data.length; x += 4) {
				arr.push(pixel(data.imgData.data, x));
			}

			var result = [];

			var k = k || 16;
			var regions = [];
			var colors = colors || [];
			var centroids = randomCentroids(arr, k, colors);

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
						var dist = distance(regions[co].key, arr[x])
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
					if (equals(newRegion[c2].key, regions[c2].key)) {
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
					var dist = distance(regions[c4].key, arr[x])
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
					//arr[x] = regions[col].key;
			}

			if (redraw === true) {
				data.redraw(result);
			}

			return {
				pixels: result,
				regions: regions
			}

		}

		data.mergeCells = function(numberOfCellMerges, size, redraw) {
			redraw = redraw || true;
			var pix = data.imgData.data;
			var width = data.width;
			for (var t = 0; t < numberOfCellMerges; t++) {
				console.log('mergin cells pass');
				var cells = data.divideIntoCells();
				var total = cells.length;
				for (var cell = 0; cell < cells.length; cell++) {
					var c = cells[cell];
					var near = (c.cell[0] - (width * 4) < 0) ? c.cell[0] + 4 : c.cell[0] - (width * 4)
					var prev = pixel(pix, near);
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

			if (redraw === true) {
				data.redraw(pix);
			}
		}

		data.edges = function(edgesOnly, color, redraw) {
			color = color || [0, 0, 0];
			redraw = redraw || true;
			var pix = data.imgData.data;
			//edges!
			console.log('defining edges');
			var cells = data.divideIntoCells();
			for (var cell = 0; cell < cells.length; cell++) {
				var c = cells[cell];
				if (edgesOnly === true) {
					for (var p in c.cell) {
						pix[c.cell[p]] = 255;
						pix[c.cell[p] + 1] = 255;
						pix[c.cell[p] + 2] = 255;
					}
				}
				for (var p in c.edges) {
					pix[c.edges[p]] = color[0];
					pix[c.edges[p] + 1] = color[0];
					pix[c.edges[p] + 2] = color[0];
				}
			}


			if (redraw === true) {
				data.redraw(pix);
			}

		}

		data.divideIntoCells = function() {
			var pix = data.imgData.data;
			var width = data.width;
			var height = data.height;
			var arr = [];
			var done = [];
			for (var x in pix) {
				arr[x] = pix[x];
			}

			for (var x = 0; x < pix.length; x += 4) {
				done.push(x);
			}
			var cells = [];
			var loop = true;
			while (loop === true) {
				var newCell = null;
				for (var y = 0; y < pix.length / 4; y++) {
					if (done[y] !== null) {
						newCell = done[y];
						break;
					}
				}
				console.log(' > cell pass');
				if (newCell === null) {
					loop = false;
				}
				var co = coord(newCell, width)
				var color = pixel(pix, newCell);
				var r = data.floodFill(co.x, co.y, color[0], color[1], color[2]);
				for (var x = 0; x < r.cell.length; x++) {
					done[r.cell[x] / 4] = null;
				}
				cells.push({
					len: r.cell.length,
					cell: r.cell,
					edges: r.edge,
					color: color
				});
				loop = !(r.cell.length === 0 || done.length === 0);
			}
			//console.log('sort')
			cells.sort(function(a, b) {
				return (a.len === b.len) ? 0 : (a.len < b.len) ? -1 : 1
			});
			return cells;
		}

		data.floodFill = function(startx, starty, startR, startG, startB) {
			var pix = data.imgData.data;
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
			var edge = [];

			while (pixelStack.length) {
				var newPos, x, y, pixelPos, reachLeft, reachRight;
				newPos = pixelStack.pop();
				x = newPos[0];
				y = newPos[1];

				pixelPos = (y * width + x) * 4;
				edge.push(pixelPos)
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
						} else {
							edge.push(pixelPos - 4);
							if (reachLeft) {
								reachLeft = false;
							}
						}
					} else if (x == 0) {
						edge.push(pixelPos)
					}

					if (x < width - 1) {
						if (matchStartColor(pixelPos + 4, startR, startG, startB)) {
							if (!reachRight) {
								pixelStack.push([x + 1, y]);
								reachRight = true;
							}
						} else {
							edge.push(pixelPos + 4);
							if (reachRight) {
								reachRight = false;
							}
						}
					} else if (x === width - 1) {
						edge.push(pixelPos)
					}

					pixelPos += width * 4;
				}
				edge.push(pixelPos - width * 4)
			}

			return {
				cell: cell,
				edge: edge
			}

			function matchStartColor(pixelPos, r, g, b) {
				var r = pix[pixelPos];
				var g = pix[pixelPos + 1];
				var b = pix[pixelPos + 2];

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
					resolve(data);
				}

				_img.src = img;

			});



			return promise;
		}

		return new Manipulator(img);
	}

	return create;



	/*
		internal functions
	*/
	function pixel(arr, s) {
		return [arr[s], arr[s + 1], arr[s + 2], arr[s + 3]]
	}

	function randomCentroids(arr, k, colors) {
		var centroids = arr.slice(0); // copy
		centroids.sort(function() {
			return (Math.round(Math.random()) - 0.5);
		});
		var cent = centroids.slice(0, k - colors.length);
		return cent.concat(colors);
		//return centroids.slice(0, k);
	}

	//euclidian distance
	function distance(c1, c2) {
		var dr = Math.abs(c1[0] - c2[0]);
		var dg = Math.abs(c1[1] - c2[1]);
		var db = Math.abs(c1[2] - c2[2]);
		return Math.sqrt(dr * dr + dg * dg + db * db)
	}


	function equals(array1, array2) {
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
				if (!array1[i].equals(array2[i]))
					return false;
			} else if (array1[i] != array2[i]) {
				return false;
			}
		}
		return true;
	}

	function coord(pos, width) {
		var x = (pos / 4) % (width)
		var c = {
			x: x,
			y: ((pos / 4) - x) / width
		}
		return c;
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

	return function get(img) {
		return new Manipulator(img)
	}
})();