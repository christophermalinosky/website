angular.module('myApp').controller('ScriptController', ["$scope", "$http", function($scope, $http){
	$scope.subScript = "";
	$scope.script = [];
	$scope.actor = "";
	$scope.actors = [];
	$scope.role = "";

	$scope.setScript = function(){
		let splitScript = $scope.script.split(/<|>/g);
		let newSubScript = [];
		for(let i = 0; i < splitScript.length; i++){
			if((i%2) == 0){
				newSubScript.push({role:"default",line:splitScript[i]}); 
			} else {
				newSubScript.push({role:"STAGE DIRECTION",line:splitScript[i]}); 
			}
		}
		$scope.subScript = newSubScript;
		$scope.actors = [];

	};

	$scope.addActor = function(){
		$scope.actors.push($scope.actor);
		let newSubScript = [];
		for(let part of $scope.subScript){
			let splitScript = part.line.split($scope.actor);
			for(let i = 0; i < splitScript.length; i++){
				if(i == 0){
					newSubScript.push({role:part.role,line:splitScript[i]}); 
				} else {
					newSubScript.push({role:$scope.actor,line:splitScript[i]}); 
				}
			}
		}
		$scope.subScript = newSubScript;
	};
}]);