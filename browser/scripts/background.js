let watchedList = {};
let activity = {};
let token = "";
let activeShow_data = {};
let lastData = {};
let logging = false;

function request(body) {
	let headers = new Headers();
	headers.append("Content-Type", "application/json");
	headers.append("Accept", "application/json");
	if (token != "") headers.append("Authorization2", `Bearer ${token}`);
	headers.append("host", "myshows.me");

	let requestOptions = {
		method: "POST",
		headers: headers,
		body: JSON.stringify(body),
		redirect: "follow",
	};

	return fetch("https://myshows.me/v3/rpc/", requestOptions)
		.then((response) => {
			return response.json();
		})
		.catch((error) => {
			return error;
		});
}

function refteshToken(refreshToken) {
	var myHeaders = new Headers();
	myHeaders.append("Accept", "*/*");
	myHeaders.append("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
	myHeaders.append("Sec-Fetch-Site", "same-site");
	myHeaders.append("Sec-Fetch-Mode", "cors");
	myHeaders.append("host", "myshows.me");

	var urlencoded = new URLSearchParams();
	urlencoded.append("client_id", "apidoc");
	urlencoded.append("client_secret", "apidoc");
	urlencoded.append("refresh_token", refreshToken);
	urlencoded.append("grant_type", "refresh_token");
	urlencoded.append("redirect_uri", "https%3A%2F%2Fapi.myshows.me%2Fshared%2Fdoc%2Fo2c.html");

	var requestOptions = {
		method: "POST",
		headers: myHeaders,
		body: urlencoded,
		redirect: "follow",
	};

	fetch("https://myshows.me/oauth/token", requestOptions).then((result) => {
		result.json().then((data) => {
			browser.storage.local
				.set({
					token: data.access_token,
					refresh_token: data.refresh_token,
					token_expires_in: Date.now() + data.expires_in,
				})
				.then(() => {
					console.log("token was refreshed");
					checkToken();
				});
		});
	});
}

function checkToken() {
	browser.storage.local.get(["token", "refresh_token", "token_expires_in"]).then((result) => {
		if (result.token == "" || !result.token || result.token == "error") return browser.storage.local.set({ token: "error" });

		if (!result.refresh_token) return browser.storage.local.set({ token: "error" });

		if (result.token_expires_in < Date.now()) return refteshToken(result.refresh_token);

		token = result.token;

		getProfileInfo();
	});
}
checkToken();

//API requests
function getProfileInfo() {
	if (token == "" || token == "error") return;

	request({
		jsonrpc: "2.0",
		method: "profile.Get",
		id: 1,
	})
		.then((profileData) => {
			browser.storage.local.set({
				avatar: profileData.result.user.avatar,
				login: profileData.result.user.login,
			});
		})
		.catch((error) => {
			browser.storage.local.set({ token: "error" });
			console.error(error);
		});
}

function findShow(title) {
	return request({
		jsonrpc: "2.0",
		method: "shows.Search",
		params: {
			query: title,
		},
		id: 1,
	}).then((show) => {
		return show.result[0];
	});
}

function getEpisodes(showID) {
	return request({
		jsonrpc: "2.0",
		method: "shows.GetById",
		params: {
			showId: showID,
			withEpisodes: true,
		},
		id: 1,
	}).then((show) => {
		return show.result.episodes;
	});
}

function findEpisode(season, episode) {
	activeShow_data.episodes.forEach((ep) => {
		if (ep.seasonNumber == season && ep.episodeNumber == episode) {
			activeShow_data.currentEpisode = ep;
		}
	});
}

function checkEpisodeRequest(episodeID) {
	return request({
		jsonrpc: "2.0",
		method: "manage.CheckEpisode",
		params: {
			id: episodeID,
			rating: 0,
		},
		id: 1,
	}).then((result) => {
		if (result.error) {
			if (result.error.code == 401) browser.storage.local.set({ token: "error" });
			return false;
		}

		return true;
	});
}

async function getWatchedEpisodes(showID) {
	return await request({
		jsonrpc: "2.0",
		method: "profile.Episodes",
		params: {
			showId: showID,
		},
		id: 1,
	}).then((episodes) => {
		return episodes.result;
	});
}

//activity functions
function sendActivity(sendResponse) {
	if (activeShow_data)
		if (activeShow_data.episodes) {
			let episodesWithoutSpecials = 0;

			activeShow_data.episodes.forEach((episode) => {
				if (!episode.isSpecial) episodesWithoutSpecials++;
			});

			activity.progress = (watchedList[activeShow_data.title].length * 100) / episodesWithoutSpecials;
		}

	if (activity != {}) {
		console.log("activity data was sended", activity);
	}
	return sendResponse(activity);
}

function getShowInfo(seriesTitle) {
	checkToken();

	findShow(seriesTitle).then((show) => {
		console.log("show was found:", show);
		activeShow_data = show;
		activity.name_localized = show.title;
		activity.name = show.titleOriginal;

		getEpisodes(activeShow_data.id).then((episodes) => {
			if (!episodes) return console.log("episodes not found");

			console.log("episodes was catched:", episodes);
			activeShow_data["episodes"] = episodes;

			if (watchedList[show.title]) return;
			getWatchedEpisodes(activeShow_data.id).then((watchedEpisodes) => {
				watchedList[activeShow_data.title] = watchedEpisodes;
				console.log("watched episodes was catched:", watchedList);
			});
		});
	});
}

function checkEpisode(season, episode) {
	findEpisode(season, episode);

	if (
		!watchedList[activeShow_data.title].find(function (e) {
			return e.id == activeShow_data.currentEpisode.id;
		})
	) {
		checkToken();

		checkEpisodeRequest(activeShow_data.currentEpisode.id).then(() => {
			watchedList[activeShow_data.title].push(activeShow_data.currentEpisode);
			console.log(`${activeShow_data.title}, ${episode} episode ${season} season, was checked!`);
		});
	}
}

function updateActivity(message) {
	if (message == null) {
		if (activity != {}) activity = {};
		if (lastData != {}) lastData = {};
		return;
	}

	if (message == "ExtensionActivityReset") {
		activity = {};
		activeShow_data = {};
		lastData = {};
		watchedList = {};
		return console.log("all data was nullified");
	}

	if (message.episode == 0 && message.season == 0) return (activity = {});

	if (
		lastData.SeriesName == message.SeriesName &&
		lastData.season == message.season &&
		lastData.episode == message.episode &&
		lastData.watched == message.watched
	)
		return;

	if (lastData.watched == true && message.watched == true) return;

	console.log("message catched:", message);
	let seriesTitle = message.SeriesName;
	lastData = message;

	if (activeShow_data == undefined) activeShow_data = {};
	if (activeShow_data.title != seriesTitle && activeShow_data.titleOriginal != seriesTitle) getShowInfo(seriesTitle);
	if (!activity.name) activity.name = activeShow_data.titleOriginal;
	if (!activity.name_localized) activity.name_localized = activeShow_data.title;

	activity.episode = message.episode;
	activity.season = message.season;

	if (message.watched == true) checkEpisode(message.season, message.episode);
}

//message catching
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.method) {
		case "get_activity":
			sendActivity(sendResponse);
			break;
		case "token_update":
			checkToken();
			break;
		case "get_profile_info":
			sendResponse({ url: avatar, login: login });
			break;
		case "set_activity":
			updateActivity(request.data);
			break;
	}
});
