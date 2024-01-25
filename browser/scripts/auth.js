window.onload = async () => {
	const params = new URLSearchParams(window.location.search);
	const code = params.get("code") ? params.get("code") : "error";

	var myHeaders = new Headers();
	myHeaders.append("Accept", "*/*");
	myHeaders.append("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
	myHeaders.append("Sec-Fetch-Site", "same-site");
	myHeaders.append("Sec-Fetch-Mode", "cors");
	myHeaders.append("host", "myshows.me");

	var urlencoded = new URLSearchParams();
	urlencoded.append("client_id", "apidoc");
	urlencoded.append("client_secret", "apidoc");
	urlencoded.append("code", code);
	urlencoded.append("grant_type", "authorization_code");
	urlencoded.append("redirect_uri", "https%3A%2F%2Fapi.myshows.me%2Fshared%2Fdoc%2Fo2c.html");

	var requestOptions = {
		method: "POST",
		headers: myHeaders,
		body: urlencoded,
		redirect: "follow",
	};

	fetch("https://myshows.me/oauth/token", requestOptions).then((result) => {
		result.json().then((data) => {
			chrome.storage.local
				.set({
					token: data.access_token,
					refresh_token: data.refresh_token,
					token_expires_in: Date.now() + data.expires_in,
				})
				.then(() => {
					chrome.runtime.sendMessage({ method: "token_update" });
					window.location.replace("https://myshows.me/my/");
				});
		});
	});
};
