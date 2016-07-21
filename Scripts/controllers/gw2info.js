angular.module('myApp').controller('GW2InfoController', ["$scope", "$http", function($scope, $http){
	$scope.itemAmounts = [];
	$scope.items = [];

	$scope.finishedAchievements = [];
	$scope.unfinishedAchievements = [];

	function processPlayerItemData(playerItems){
		for(let i = 0; i < playerItems.length; i++){
			let currentItem = playerItems[i];
			//Bag items are null if they are not using the slot
			if(currentItem !== null && currentItem.count !== 0){
				//Items in characters inventories that fill a slot do not have a count
				if(currentItem.count == undefined){
					currentItem.count = 1;
				}
				if($scope.itemAmounts[currentItem.id] == undefined){
					$scope.itemAmounts[currentItem.id] = currentItem.count;
				} else {
					$scope.itemAmounts[currentItem.id] = $scope.itemAmounts[currentItem.id] + currentItem.count;
				}
			}
		}
	}
	//My API token = 3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF

	let characterPromise = $http.get('https://api.guildwars2.com/v2/characters/Belrath Ironblood?access_token=3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF')
	.then(function(playerCharacterResponse){
		processPlayerItemData(playerCharacterResponse.data.equipment);
		for(let i = 0; i < playerCharacterResponse.data.bags.length; i++){
			processPlayerItemData(playerCharacterResponse.data.bags);
			processPlayerItemData(playerCharacterResponse.data.bags[i].inventory);
		}
	});

	let bankPromise = $http.get('https://api.guildwars2.com/v2/account/bank?access_token=3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF')
	.then(function(bankItemResponse){
		processPlayerItemData(bankItemResponse.data);
	});
	
	let materialPromise = $http.get('https://api.guildwars2.com/v2/account/materials?access_token=3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF')
	.then(function(materialItemResponse){
		processPlayerItemData(materialItemResponse.data);
	});

	Promise.all([characterPromise,bankPromise,materialPromise])
	.then(function(response){
		let itemKeys = Object.keys($scope.itemAmounts);
		for(let i = 0; i < itemKeys.length; i++){
		let currentKey = itemKeys[i];
		$http.get('https://api.guildwars2.com/v2/items/' + currentKey)
		.then(function(itemResponse){
			itemResponse.data.count = $scope.itemAmounts[currentKey];
			$scope.items.push(itemResponse.data);
			});
		}
	});
	

	$http.get('https://api.guildwars2.com/v2/account/achievements?access_token=3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF')
	.then(function(playerAchievementResponse) {
		let playerAchievementData = playerAchievementResponse.data;
		let httpRequestString = 'https://api.guildwars2.com/v2/achievements?ids=';
		console.log(playerAchievementData.length);
		for(let i = 0; i < 100; i++){
			//Achievement 1257 in the player list is not in the achievement list
			if(playerAchievementData[i].id !== 1257){
				if(i == 0){
					httpRequestString = httpRequestString + playerAchievementData[i].id;
				} else {
					httpRequestString = httpRequestString + ',' + playerAchievementData[i].id;
				}
			}
		}
		$http.get(httpRequestString)
		.then(function(achievementFullDataResponse){
			let fullAchievementData = achievementFullDataResponse.data;
			for(let i = 0; i < fullAchievementData.length; i++){
				let currentPlayerAchievement = fullAchievementData[i];
				if(currentPlayerAchievement.done){
					$scope.finishedAchievements.push(achievementResponse.data);
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
		});
	});
}]);