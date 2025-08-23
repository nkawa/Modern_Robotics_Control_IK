"use client"

// client side
// just use local proxy
const ENEBULAR_ENDPOINT = process.env.NEXT_PUBLIC_LOG_ENDPOINT || "endopint"

//console.log("Endpoint: ", ENEBULAR_ENDPOINT)

export async function logEnebular(location, logType, vUID, wUID, title, desc) {

	// 繰り返しのログは避けたい

	try {
		fetch(
			ENEBULAR_ENDPOINT,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					'location': location,
					'type': logType,
					'virtualKominkanUserId': vUID,
					'workerAppUserId': wUID,
					'title': title,
					'description': desc,
				})
			}).then(async (response) => {
				if (!response.ok) {
					console.log("Fetch Error", response)
				} else {
					console.log("Fetch log:", await response.json(), response)
				}
			});
	} catch (error) {
		console.log("logEnabular Fetch Error:", error);
	}
}

