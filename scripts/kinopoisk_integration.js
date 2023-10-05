function sendStatus(episode, season, SeriesName, watched) {
	let data = {
		episode: episode,
		season: season,
		SeriesName: SeriesName,
		watched: watched,
	};

	chrome.runtime.sendMessage({
		method: "set_activity",
		data: data,
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
		let button = document.querySelector(
			".BaseButton_button___1Cj0.BaseButton_orange__J9N9H.styles_button__Z1Jox"
		);

		let skipTitlesButton = document.querySelector(
			".BaseButton_button___1Cj0.BaseButton_gray__tRqQq.styles_button__Z1Jox"
		);

		let ratingSeries = document.querySelector('p[data-tid="UserRatingVoteDialog"]');

		let params = new URLSearchParams(window.location.search);
		let episode = Number(params.get("episode"));
		let season = Number(params.get("season"));

		let rawSeriesName = document.querySelector('title[data-tid="HdSeoHead"]');
		if (!rawSeriesName) return;

		let SeriesName = rawSeriesName.innerText
			.replace("— смотреть онлайн в хорошем качестве — Кинопоиск", " ")
			.trim()
			.split(" (", 1)[0];

		if (skipTitlesButton)
			if (skipTitlesButton.innerText == "Смотреть титры")
				return sendStatus(episode, season, SeriesName, true);

		if (ratingSeries)
			if (ratingSeries.innerText == "Оцените фильм")
				return sendStatus(episode, season, SeriesName, true);

		if (!button) return sendStatus(episode, season, SeriesName, false);

		if (button.lastChild.textContent != "Следующая серия")
			return sendStatus(episode, season, SeriesName, false);

		sendStatus(episode, season, SeriesName, true);
	}, 2500);
};
