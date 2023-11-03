console.log("kinopoisk integration was enjected!");

let lastData = {};

function sendStatus(data) {
	if (lastData.SeriesName == data.SeriesName)
		if (lastData.season == data.season) if (lastData.episode == data.episode) if (lastData.watched == data.watched) return;

	chrome.runtime
		.sendMessage({
			method: "set_activity",
			data: data,
		})
		.then(() => {
			lastData = data;
		});
}

window.onbeforeunload = function () {
	chrome.runtime.sendMessage({
		method: "set_activity",
		data: null,
	});
};

window.onload = function () {
	setInterval(() => {
		let button = document.querySelector(".BaseButton_button___1Cj0.BaseButton_orange__J9N9H.styles_button__Z1Jox");

		let skipTitlesButton = document.querySelector(".BaseButton_button___1Cj0.BaseButton_gray__tRqQq.styles_button__Z1Jox");

		let ratingSeries = document.querySelector('p[data-tid="UserRatingVoteDialog"]');

		let params = new URLSearchParams(window.location.search);
		let episode = Number(params.get("episode"));
		let season = Number(params.get("season"));

		let rawSeriesName = document.querySelector('title[data-tid="HdSeoHead"]');
		if (!rawSeriesName) return;

		let SeriesName = rawSeriesName.innerText.replace("— смотреть онлайн в хорошем качестве — Кинопоиск", " ").trim().split(" (", 1)[0];

		let data = {
			episode: episode,
			season: season,
			SeriesName: SeriesName,
			watched: false,
		};

		if (SeriesName.endsWith("Кинопоиск") || SeriesName.endsWith("Кинопоиске")) return;
		if (skipTitlesButton) if (skipTitlesButton.innerText == "Смотреть титры") data.watched = true;
		if (ratingSeries) if (ratingSeries.innerText == "Оцените фильм") data.watched = true;
		if (button) if (button.lastChild.textContent != "Следующая серия") data.watched = false;

		sendStatus(data);
	}, 1000);
};
