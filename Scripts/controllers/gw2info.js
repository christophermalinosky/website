angular.module('myApp').controller('GW2InfoController', ["$scope", "$http", function($scope, $http){
	$scope.items = [];
	$scope.characters = [];
	$scope.selectedCharacter;

	$scope.finishedAchievements = [];
	$scope.unfinishedAchievements = [];

	const allCharacterOption = "All";
	//The string for a http request can only be so long
	const maxItemIdsPerRequest = 180;
	const maxAchievementIdsPerRequest = 200;

	function processPlayerItemData(playerItems, itemAmounts){
		for(let i = 0; i < playerItems.length; i++){
			let currentItem = playerItems[i];
			//Bag items are null if they are not using the slot
			if(currentItem !== null && currentItem.count !== 0){
				//Items in characters inventories that fill a slot do not have a count
				if(currentItem.count == undefined){
					currentItem.count = 1;
				}
				if(itemAmounts[currentItem.id] == undefined){
					itemAmounts[currentItem.id] = currentItem.count;
				} else {
					itemAmounts[currentItem.id] = itemAmounts[currentItem.id] + currentItem.count;
				}
			}
		}
	}

	function processCharacterItemResponse(playerCharacterResponse, itemAmounts){
		processPlayerItemData(playerCharacterResponse.data.equipment, itemAmounts);
		processPlayerItemData(playerCharacterResponse.data.bags, itemAmounts);
		for(let i = 0; i < playerCharacterResponse.data.bags.length; i++){
			processPlayerItemData(playerCharacterResponse.data.bags[i].inventory, itemAmounts);
		}
	}

	//My API token = 3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF

	$scope.getItems = function(characterName){
		$scope.items.length = 0;
		const itemAmounts = [];

		let characterPromise;
		if(characterName === allCharacterOption){
			let allCharacterPromises = [];
			for(let i = 0; i < $scope.characters.length - 1; i++){
				allCharacterPromises.push($http.get('https://api.guildwars2.com/v2/characters/' + $scope.characters[i] + '?access_token=' + $scope.apiKey)
				.then((playerCharacterResponse) => {
					processCharacterItemResponse(playerCharacterResponse, itemAmounts)
				}));
			}
			characterPromise = Promise.all(allCharacterPromises);
		} else if(characterName){
			$http.get('https://api.guildwars2.com/v2/characters/' + characterName + '?access_token=' + $scope.apiKey)
			.then((playerCharacterResponse) => {
				processCharacterItemResponse(playerCharacterResponse, itemAmounts)
			});
		} else {
			$scope.characters.length = 0;
			$scope.selectedCharacter = undefined;
			characterPromise = $http.get('https://api.guildwars2.com/v2/characters?access_token=' + $scope.apiKey)
			.then((playerAllCharactersResponse) => {
				let playerAllCharactersData = playerAllCharactersResponse.data;
				for(let i = 0; i < playerAllCharactersData.length; i++){
					$scope.characters.push(playerAllCharactersData[i]);
				}
				$scope.characters.push(allCharacterOption);
				$scope.selectedCharacter = $scope.characters[0];
				return $http.get('https://api.guildwars2.com/v2/characters/' + $scope.selectedCharacter + '?access_token=' + $scope.apiKey);
			}).then((playerCharacterResponse) => {
				processCharacterItemResponse(playerCharacterResponse, itemAmounts)
			});
		}

		let bankPromise = $http.get('https://api.guildwars2.com/v2/account/bank?access_token='  + $scope.apiKey)
		.then((bankItemResponse) => {
			processPlayerItemData(bankItemResponse.data, itemAmounts);
		});
		
		let materialPromise = $http.get('https://api.guildwars2.com/v2/account/materials?access_token=' + $scope.apiKey)
		.then((materialItemResponse) => {
			processPlayerItemData(materialItemResponse.data, itemAmounts);
		});
		let itemFullDataResponses = [];
		let itemCostFullDataResponses = [];
		Promise.all([characterPromise,bankPromise,materialPromise])
		.then((response) => {
			let itemKeys = Object.keys(itemAmounts);

			const numberOfItemRequests = Math.ceil(itemKeys.length/maxItemIdsPerRequest);
			let itemPromises = [];
			for(let i = 0; i < numberOfItemRequests; i++){
				let httpRequestString = 'https://api.guildwars2.com/v2/items?ids=';
				const maxItemIndex = Math.min(maxItemIdsPerRequest * (i + 1), itemKeys.length);
				for(let j = maxItemIdsPerRequest * i; j < maxItemIndex; j++){
					if(j % maxItemIdsPerRequest == 0){
						httpRequestString = httpRequestString + itemKeys[j];
					} else {
						httpRequestString = httpRequestString + ',' + itemKeys[j];
					}
				}
				itemPromises.push($http.get(httpRequestString).then((response) => itemFullDataResponses.push(response)));
			}

			let itemCostPromises = [];
			for(let i = 0; i < numberOfItemRequests; i++){
				let httpRequestString = 'https://api.guildwars2.com/v2/commerce/prices?ids=';
				const maxItemIndex = Math.min(maxItemIdsPerRequest * (i + 1), itemKeys.length);
				for(let j = maxItemIdsPerRequest * i; j < maxItemIndex; j++){
					if(j % maxItemIdsPerRequest == 0){
						httpRequestString = httpRequestString + itemKeys[j];
					} else {
						httpRequestString = httpRequestString + ',' + itemKeys[j];
					}
				}
				itemCostPromises.push($http.get(httpRequestString).then((response) => itemCostFullDataResponses.push(response)));
			}
			return Promise.all(itemPromises.concat(itemCostPromises));
		}).then((allCompletedResponse) => {
			for(let i = 0; i < itemFullDataResponses.length; i++){
				let fullItemData = itemFullDataResponses[i].data;
				let fullItemCostData = itemCostFullDataResponses[i].data;

				console.log(itemFullDataResponses);
				console.log(itemCostFullDataResponses);
				for(let j = 0; j < fullItemData.length; j++){
					currentItemData = fullItemData[j];

					if(fullItemCostData[j]){
						currentItemData.hasPrice = true;
						currentItemData.buy_price_gold = Math.floor(fullItemCostData[j].buys.unit_price / 10000 );
						currentItemData.buy_price_silver = Math.floor((fullItemCostData[j].buys.unit_price % 10000) / 100);
						currentItemData.buy_price_copper = Math.floor(fullItemCostData[j].buys.unit_price % 100);
						currentItemData.sell_price_gold = Math.floor(fullItemCostData[j].sells.unit_price / 10000 );
						currentItemData.sell_price_silver = Math.floor((fullItemCostData[j].sells.unit_price % 10000) / 100);
						currentItemData.sell_price_copper = Math.floor(fullItemCostData[j].sells.unit_price % 100);
					} else {
						currentItemData.hasPrice = false;
					}
					currentItemData.count = itemAmounts[currentItemData.id];
					$scope.items.push(currentItemData);
				}
			}
			$scope.$apply();
		});
	}
	
	$scope.getAchievements = function(){
		$scope.finishedAchievements.length = 0;
		$scope.unfinishedAchievements.length = 0;

		const achievementFullDataResponses = [];
		const playerAchievementDataMap =[];
		$http.get('https://api.guildwars2.com/v2/account/achievements?access_token='  + $scope.apiKey)
		.then((playerAchievementResponse) => {
			let playerAchievementData = playerAchievementResponse.data;
			for(let i = 0; i < playerAchievementData.length; i++){
				playerAchievementDataMap[playerAchievementData[i].id] = playerAchievementData[i];
			}
			const numberOfAchievementRequests = Math.ceil(playerAchievementData.length/maxAchievementIdsPerRequest);
			let achievementPromises = [];
			for(let i = 0; i < numberOfAchievementRequests; i++){
				let httpRequestString = 'https://api.guildwars2.com/v2/achievements?ids=';
				const maxAchievementIndex = Math.min(maxAchievementIdsPerRequest * (i + 1), playerAchievementData.length);
				for(let j = maxAchievementIdsPerRequest * i; j < maxAchievementIndex; j++){
					//Achievement 1257 in the player list is not in the achievement list
					if(playerAchievementData[j].id !== 1257){
						if(j % maxAchievementIdsPerRequest == 0){
							httpRequestString = httpRequestString + playerAchievementData[j].id;
						} else {
							httpRequestString = httpRequestString + ',' + playerAchievementData[j].id;
						}
					}
				}
				achievementPromises.push($http.get(httpRequestString).then((response) => achievementFullDataResponses.push(response)));
			}

			return Promise.all(achievementPromises);
		}).then((allCompletedResponse) => {
			for(let i = 0; i < achievementFullDataResponses.length; i++){
				let fullAchievementData = achievementFullDataResponses[i].data;
				for(let j = 0; j < fullAchievementData.length; j++){
					let currentPlayerAchievement = fullAchievementData[j];

					let currentAccountAchievementData = playerAchievementDataMap[currentPlayerAchievement.id];
					currentPlayerAchievement.done = currentAccountAchievementData.done;
					currentPlayerAchievement.current = currentAccountAchievementData.current;
					currentPlayerAchievement.max = currentAccountAchievementData.max;

					if(currentPlayerAchievement.done){
						$scope.finishedAchievements.push(currentPlayerAchievement);
					} else {
						if(currentPlayerAchievement.max == -1){
							currentPlayerAchievement.percent = -1;
						} else {
							currentPlayerAchievement.percent = Math.round((currentPlayerAchievement.current/currentPlayerAchievement.max) * 10000)/100;
						}
						$scope.unfinishedAchievements.push(currentPlayerAchievement);
					}
				}
				$scope.unfinishedAchievements.sort(function(a,b) {
					return b.percent- a.percent;
				});
			}
		});
	}
}]);