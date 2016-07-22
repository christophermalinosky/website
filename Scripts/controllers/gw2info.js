angular.module('myApp').controller('GW2InfoController', ["$scope", "$http", function($scope, $http){
	$scope.items = [];
	$scope.characters = [];
	$scope.selectedCharacter;

	$scope.finishedAchievements = [];
	$scope.unfinishedAchievements = [];

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

	//My API token = 3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF

	$scope.getItems = function(characterName){
		$scope.items.length = 0;
		const itemAmounts = [];

		let characterPromise;
		if(characterName === "All"){
			let allCharacterPromises = [];
			for(let i = 0; i < $scope.characters.length - 1; i++){
				allCharacterPromises.push($http.get('https://api.guildwars2.com/v2/characters/' + $scope.characters[i] + '?access_token=' + $scope.apiKey)
				.then((playerCharacterResponse) => {
					processPlayerItemData(playerCharacterResponse.data.equipment, itemAmounts);
					processPlayerItemData(playerCharacterResponse.data.bags, itemAmounts);
					for(let i = 0; i < playerCharacterResponse.data.bags.length; i++){
						processPlayerItemData(playerCharacterResponse.data.bags[i].inventory, itemAmounts);
					}
				}));
			}
			characterPromise = Promise.all(allCharacterPromises);
		} else if(characterName){
			$http.get('https://api.guildwars2.com/v2/characters/' + characterName + '?access_token=' + $scope.apiKey)
			.then((playerCharacterResponse) => {
				processPlayerItemData(playerCharacterResponse.data.equipment, itemAmounts);
				processPlayerItemData(playerCharacterResponse.data.bags, itemAmounts);
				for(let i = 0; i < playerCharacterResponse.data.bags.length; i++){
					processPlayerItemData(playerCharacterResponse.data.bags[i].inventory, itemAmounts);
				}
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
				$scope.characters.push("All");
				$scope.selectedCharacter = $scope.characters[0];
				return $http.get('https://api.guildwars2.com/v2/characters/' + $scope.selectedCharacter + '?access_token=' + $scope.apiKey);
			}).then((playerCharacterResponse) => {
				processPlayerItemData(playerCharacterResponse.data.equipment, itemAmounts);
				processPlayerItemData(playerCharacterResponse.data.bags, itemAmounts);
				for(let i = 0; i < playerCharacterResponse.data.bags.length; i++){
					processPlayerItemData(playerCharacterResponse.data.bags[i].inventory, itemAmounts);
				}
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
		Promise.all([characterPromise,bankPromise,materialPromise])
		.then((response) => {
			let itemKeys = Object.keys(itemAmounts);

			//Can only request 200 ids at a time from api
			const numberOfItemRequests = Math.ceil(itemKeys.length/150);
			let itemPromises = [];
			for(let i = 0; i < numberOfItemRequests; i++){
				let httpRequestString = 'https://api.guildwars2.com/v2/items?ids=';
				const maxItemIndex = Math.min(150 * (i + 1), itemKeys.length);
				for(let j = 150 * i; j < maxItemIndex; j++){
					if(j == 0){
						httpRequestString = httpRequestString + itemKeys[j];
					} else {
						httpRequestString = httpRequestString + ',' + itemKeys[j];
					}
				}
				itemPromises.push($http.get(httpRequestString).then((response) => itemFullDataResponses.push(response)));
			}
			return Promise.all(itemPromises);
		}).then((allCompletedResponse) => {
			for(let i = 0; i < itemFullDataResponses.length; i++){
				let fullItemData = itemFullDataResponses[i].data;
				for(let j = 0; j < fullItemData.length; j ++){
					currentItemData = fullItemData[j];
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
			//Can only request 200 ids at a time from api
			const numberOfAchievementRequests = Math.ceil(playerAchievementData.length/200);
			let achievementPromises = [];
			for(let i = 0; i < numberOfAchievementRequests; i++){
				let httpRequestString = 'https://api.guildwars2.com/v2/achievements?ids=';
				const maxAchievementIndex = Math.min(200 * (i + 1), playerAchievementData.length);
				for(let j = 200 * i; j < maxAchievementIndex; j++){
					//Achievement 1257 in the player list is not in the achievement list
					if(playerAchievementData[j].id !== 1257){
						if(j == 0){
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