console.log("kinopoisk integration was enjected!");

function sendStatus(data) {
	chrome.runtime.sendMessage({
		method: "set_activity",
		data: data,
	});
}

window.onbeforeunload = function () {
	chrome.runtime.sendMessage({
		method: "set_activity",
		data: "ExtensionActivityReset",
	});
};

(() => {
	setInterval(() => {
		let button = document.querySelector(".BaseButton_button___1Cj0.BaseButton_orange__J9N9H.styles_button__Z1Jox");
		let skipTitlesButton = document.querySelector(".BaseButton_button___1Cj0.BaseButton_gray__tRqQq.styles_button__Z1Jox");
		let ratingSeries = document.querySelector('p[data-tid="UserRatingVoteDialog"]');

		let params = new URLSearchParams(window.location.search);
		let episode = Number(params.get("episode"));
		let season = Number(params.get("season"));

		let rawSeriesName = document.querySelector('title[data-tid="HdSeoHead"]');
		if (!rawSeriesName) return;

		let SeriesName = rawSeriesName.innerText.replace("— смотреть онлайн в хорошем качестве — Кинопоиск", "").split(" (", 1)[0];

		let data = {
			episode: episode,
			season: season,
			SeriesName: SeriesName,
			watched: false,
		};

		if (SeriesName.includes("Кинопоиск") || SeriesName.includes("Kinopoisk")) return sendStatus(null);
		let remaining = document.querySelector(".styles_root__yh787.styles_progress__Ypg9d");

		if (remaining && (remaining.style.transform.replace(/[^\d.]/g, "") > 0.9) && (remaining.style.transform.replace(/[^\d.]/g) < 1)) {
			data.watched = true;
		}

		sendStatus(data);
	}, 1000);
})();
