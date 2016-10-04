'use strict';

app.controller('PageController', ['$scope', 'appconf', '$route', 'menu', 'jwtHelper', 'scaTask',
function($scope, appconf, $route, menu, jwtHelper, scaTask) {
    $scope.appconf = appconf;
    $scope.title = appconf.title;
    $scope.menu = menu;

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) $scope.user = jwtHelper.decodeToken(jwt);
}]);

app.controller('NewTaskController', ['$scope', 'toaster', '$http', 'jwtHelper', 'scaMessage', 'instance', '$routeParams', '$location',
function($scope, toaster, $http, jwtHelper, scaMessage, instance, $routeParams, $location) {
    scaMessage.show(toaster);

    $scope.task = {
        service: "soichih/sca-service-noop",
    };

    instance.then(function(_instance) {
        $scope.instance = _instance;
        console.dir($scope.instance);
        $scope.task.instance_id = _instance._id; 
    });

    /*
    $http.get($scope.appconf.wf_api+"/service")
    .then(function(res) {
        $scope.services = res.data.services;
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });
    */

    $scope.submit = function() {
        //parse jsons
        if($scope.task.config) $scope.task.config = JSON.parse($scope.task.config);
        if($scope.task.resource_deps) $scope.task.resource_deps = JSON.parse($scope.task.resource_deps);
        if($scope.task.deps) $scope.task.deps = JSON.parse($scope.task.deps);
        //console.dir($scope.task);
        $http.post($scope.appconf.wf_api+"/task", $scope.task)
        .then(function(res) {
            console.dir(res);
            toaster.pop("success", "Submitted a new task");
            $location.path("/task/"+res.data.task._id);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }

    /*
    function do_import(download_task) {
        $http.post($scope.appconf.wf_api+"/task", {
            instance_id: $scope.instance._id,
            service: "soichih/sca-product-life", //invoke product-nifti's importer
            config: {
                source_dir: download_task._id+"/download" //import source
            },
            deps: [download_task._id],
        })
        .then(function(res) {
            var import_task = res.data.task;
            //$location.path("/import/"+$routeParams.instid+"/"+res.data.task.progress_key);
            $location.path("/import/"+$routeParams.instid+"/"+import_task._id);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    */

    /*
    $scope.back = function() {
        $location.path("/process/"+$routeParams.instid);
    }
    */
}]);

//center of the star
app.controller('ProcessController', ['$scope', 'menu', 'scaMessage', 'toaster', 'jwtHelper', '$http', '$location', '$routeParams', 'instance',
function($scope, menu,  scaMessage, toaster, jwtHelper, $http, $location, $routeParams, instance) {
    scaMessage.show(toaster);

    instance.load($routeParams.instid).then(function(_instance) { $scope.instance = _instance; });

    //find the latest successful nifti data products
    $http.get($scope.appconf.wf_api+"/task", {params: {
        //find one with nifti output
        where: {
            instance_id: $routeParams.instid,
            "products.type": "life/brain",
            status: "finished",
        },
        //find the latest one
        sort: "-finish_date",
        limit: 1,
    }})
    .then(function(res) {
        if(res.data.tasks[0]) {
            $scope.input_task = res.data.tasks[0];
            $scope.inputs = $scope.input_task.products.files;
            $scope.inputs.forEach(function(file) {
                file.checked = true;
            });
        }
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });

    /*
    //load previously submitted tasks
    $http.get($scope.appconf.wf_api+"/task", {params: {
        //find one with nifti output
        where: {
            instance_id: $routeParams.instid,
            service: "soichih/sca-service-life",
        }
    }})
    .then(function(res) {
        $scope.tasks = res.data;
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });
    */

    //make sure user has place to submit the main service (if not.. alert user!)
    $http.get($scope.appconf.wf_api+"/resource/best", {params: {
        service: "soichih/sca-service-life",
    }}).then(function(res) {
        $scope.best = res.data;
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });

    $scope.open = function(task) {
        $location.path("/task/"+$routeParams.instid+"/"+task._id);
        //open sca generic task viewer
        //window.open($scope.appconf.sca_url+"#/task/"+$routeParams.instid+"/"+task._id, "task:"+task._id);
    }

    $scope.submit = function() {
        //will be set to the latest input
        //TODO - should I let user aggregate?
        if(!$scope.instance.config) $scope.instance.config = {};
        $scope.instance.config.input_task_id = $scope.input_task._id;

        //list input files checked
        $scope.instance.config.files = [];
        $scope.inputs.forEach(function(input) {
            if(input.checked) $scope.instance.config.files.push(input);
        });
        $scope.instance.config.files.forEach(function(file) { delete file.checked });

        $http.post($scope.appconf.wf_api+"/task", {
            instance_id: $scope.instance._id,
            service: "soichih/sca-service-life",
            config: $scope.instance.config,
            deps: [$scope.input_task._id],
        })
        .then(function(res) {
            //toaster.success(res.data.message);
            $location.path("/task/"+$routeParams.instid+"/"+res.data.task._id);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }

    $scope.addinput = function() {
        $location.path("/input/"+$routeParams.instid);
    }

    //$scope.editingheader = false;
    $scope.editheader = function() {
        $scope.editingheader = true;
    }
    $scope.updateheader = function() {
        instance.save($scope.instance).then(function(_instance) {
            $scope.editingheader = false;
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
}]);

app.controller('ImportController', 
['$scope', 'menu', 'scaMessage', 'toaster', 'jwtHelper', '$http', '$location', '$routeParams', '$timeout', 'instance', 'scaTask',
function($scope, menu, scaMessage, toaster, jwtHelper, $http, $location, $routeParams, $timeout, instance, scaTask) {
    scaMessage.show(toaster);

    instance.load($routeParams.instid).then(function(_instance) {
        $scope.instance = _instance;
    });

    $scope.taskid = $routeParams.taskid;

    $scope.task = scaTask.get($routeParams.taskid);
    $scope.$watchCollection('task', function(task) {
        if(task.status == "finished") $location.path("/process/"+$routeParams.instid);
    });

    $scope.back = function() {
        $location.path("/input/"+$routeParams.instid);
    }
}]);

app.controller('TaskController', 
['$scope', 'menu', 'scaMessage', 'toaster', 'jwtHelper', '$http', '$location', '$routeParams', '$timeout', 'scaTask', 'scaResource',
function($scope, menu, scaMessage, toaster, jwtHelper, $http, $location, $routeParams, $timeout, scaTask, scaResource) {
    scaMessage.show(toaster);

    $scope.taskid = $routeParams.taskid;
    $scope.jwt = localStorage.getItem($scope.appconf.jwt_id);
    $scope.activetab = 0; //raw

    $scope.task = scaTask.get($routeParams.taskid);

    $scope.resource = null; //resource where this task is running/ran
    
    $scope.$watchCollection('task', function(task) {
       //also load resource info
        if(task.resource_id && !$scope.resource) {
            $scope.resource = {}; //prevent double loading if task gets updated while waiting
            /*
            $http.get($scope.appconf.wf_api+"/resource", {params: {
                where: {_id: task.resource_id}
            }})
            .then(function(res) {
                $scope.resource = res.data[0];
                //console.dir($scope.resource);
            }, function(res) {
                if(res.data && res.data.message) toaster.error(res.data.message);
                else toaster.error(res.statusText);
            });
            */
            $scope.resource = scaResource.get(task.resource_id);
        }
    });

    $scope.back = function() {
        $location.path("/process/"+$routeParams.instid);
    }
}]);

//just a list of previously submitted tasks
app.controller('TasksController', ['$scope', 'menu', 'scaMessage', 'toaster', 'jwtHelper', '$http', '$location', '$routeParams', 'instance',
function($scope, menu,  scaMessage, toaster, jwtHelper, $http, $location, $routeParams, instance) {
    scaMessage.show(toaster);

    instance.then(function(_instance) { 
        $scope.instance = _instance; 
        
        //load previously submitted tasks
        $http.get($scope.appconf.wf_api+"/task", {params: {
            where: {
                instance_id: _instance._id
            }
        }})
        .then(function(res) {
            $scope.tasks = res.data.tasks;
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    });

    $scope.open = function(task) {
        $location.path("/task/"+task._id);
    }
    $scope.new = function() {
        $location.path("/newtask");
    }
}]);

