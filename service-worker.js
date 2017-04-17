const CACHE_VERSION = 1;
const CACHE_KEY = "timer-v" + CACHE_VERSION;

self.addEventListener("install", function(event) {
	console.log("Service Worker installed.");

	// Cache our main assets. Additional ones like fonts that the browser may or may not request
	// (and that we don't depend on for running the app) are not initially cached but only on request.
	event.waitUntil(
		caches.open(CACHE_KEY).then(function(cache) {
			return cache.addAll([
				"css/main.css",
				"js/main.js"
			]);
		})
	);
});

self.addEventListener("activate", function(event) {
	console.log("Service Worker activated.");

	// Remove caches from older versions.
	event.waitUntil(
		caches.keys().then(function(cacheNames) {
			return Promise.all(
				cacheNames.filter(function(cacheName) {
					return cacheName != CACHE_KEY;
				}).map(function(cacheName) {
					return caches.delete(cacheName);
				})
			);
		})
	);
});

self.addEventListener("fetch", function(event) {
	// console.log("Received request for " + event.request.url);

	// When resources are requested, try to fetch them from the cache first.
	// Also trigger a fetch request to update the resource from the network and cache the result.
	// If the cache match fails, wait for the network fetch to finish and return its result.
	event.respondWith(
		caches.open(CACHE_KEY).then(function(cache) {
			return cache.match(event.request).then(function(response) {
				var fetchPromise = fetch(event.request).then(function(response) {
					cache.put(event.request, response.clone());
					return response;
				});
				return response || fetchPromise;
			});
		}).catch(function(error) {
			console.log("Cache is broken!");
			throw error;
		})
	);

	// Go to network first, caching on success, and fall back to cache if network fails.
	// event.respondWith(
	// 	caches.open(CACHE_KEY).then(function(cache) {
	// 		return fetch(event.request).then(function(response) {
	// 			console.log("Responding to request for " + event.request.url + " with network result.");
	// 			cache.put(event.request, response.clone());
	// 			return response;
	// 		}).catch(function(error) {
	// 			console.log("Network request failed for " + event.request.url + ", using cache. Error was:");
	// 			console.log(error);
	// 			return cache.match(event.request);
	// 		});
	// 	}).catch(function(error) {
	// 		console.log("Cache is broken!");
	// 		throw error;
	// 	})
	// );
});