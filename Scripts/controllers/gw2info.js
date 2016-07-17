angular.module('myApp').controller('GW2InfoController', ["$scope", "$http", function($scope, $http){
	$scope.itemAmounts = [];
	$scope.itemLocations = [];
	$scope.items = [];

	$scope.finishedAchievements = [];
	$scope.unfinishedAchievements = [];

	function processPlayerItemData(playerItems, iLocation){
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

				if ($scope.itemLocations[currentItem.id] == undefined)
				{
					$scope.itemLocations[currentItem.id] = {location:[iLocation]};
				}
				else
				{
					let match = false;
					for (let x = 0; x < $scope.itemLocations[currentItem.id].location.length; x++)
					{
						if ($scope.itemLocations[currentItem.id].location[x] == iLocation)
						{
							match = true;
							break;
						}
					}
					if (!match)
					{
						$scope.itemLocations[currentItem.id].location.push(iLocation);
					}
				}
			}
		}
	}
	//My API token = 3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF

	$http.get('https://api.guildwars2.com/v2/characters/Belrath Ironblood?access_token=3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF')
	.then(function(playerCharacterResponse){
		processPlayerItemData(playerCharacterResponse.data.equipment, "Belrath Ironblood - Equipment");
		for(let i = 0; i < playerCharacterResponse.data.bags.length; i++){
			processPlayerItemData(playerCharacterResponse.data.bags, "Belrath Ironblood - Bags");
			processPlayerItemData(playerCharacterResponse.data.bags[i].inventory, "Belrath Ironblood - Bags");
		}

		$http.get('https://api.guildwars2.com/v2/account/bank?access_token=3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF')
		.then(function(bankItemResponse){
			processPlayerItemData(bankItemResponse.data, "Bank");

			$http.get('https://api.guildwars2.com/v2/account/materials?access_token=3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF')
			.then(function(materialItemResponse){
				processPlayerItemData(materialItemResponse.data, "Bank");

				let itemKeys = Object.keys($scope.itemAmounts);
				for(let i = 0; i < itemKeys.length; i++){
					let currentKey = itemKeys[i];
					$http.get('https://api.guildwars2.com/v2/items/' + currentKey)
					.then(function(itemResponse){
						itemResponse.data.count = $scope.itemAmounts[currentKey];
						itemResponse.data.location = $scope.itemLocations[currentKey].location;
						$scope.items.push(itemResponse.data);
					});
				}
			});
		});
	});
/*
	$http.get('https://api.guildwars2.com/v2/account/achievements?access_token=3AD5F2A8-7A47-6F45-BB63-4877D43D0DFD830BD2B8-A2F3-4A9A-A5D7-351A53CE53AF')
	.then(function(playerAchievementResponse) {
		let playerAchievementData = playerAchievementResponse.data;
		for(let i = 0; i < playerAchievementData.length; i++){
			let currentPlayerAchievement = playerAchievementData[i];
			$http.get('https://api.guildwars2.com/v2/achievements/' + currentPlayerAchievement.id)
			.then(function(achievementResponse){
				if(currentPlayerAchievement.done && achievementResponse.icon !== null){
					$scope.finishedAchievements.push(achievementResponse.data);
				} else {
					if(currentPlayerAchievement.max == -1){
						achievementResponse.data.percent = -1;
					} else {
						achievementResponse.data.percent = Math.round((currentPlayerAchievement.current/currentPlayerAchievement.max) * 10000)/100;
					}
					$scope.unfinishedAchievements.push(achievementResponse.data);
					$scope.unfinishedAchievements.sort(function(a,b) {
						return b.percent- a.percent;
					});
				}
			})
		}
	}); */
}]);