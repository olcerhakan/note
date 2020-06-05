//AngularJs Version
var apiUrl = "https://mynoteapi.hakanolcer.xyz/"
var app = angular.module("myApp", ["ngRoute"]);


app.directive("messages", function () {
    return {
        templateUrl: "/directives/messages.html"
    };

});

app.config(function ($routeProvider) {
    $routeProvider
        .when("/", { templateUrl: "pages/app.html", controller: "appController" })
        .when("/login", { templateUrl: "pages/login.html", controller: "loginController" });
})
    .run(function ($rootScope, $location) {

        //https://stackoverflow.com/questions/26340181/angularjs-copy-common-properties-from-one-object-to-another/26341011#26341011
        $rootScope.update = function (srcObj, destObj) {
            for (var key in destObj) {
                if (destObj.hasOwnProperty(key) && srcObj.hasOwnProperty(key)) {
                    destObj[key] = srcObj[key];
                }
            }
        }


        $rootScope.loginData = function () {
            var loginDataJson = localStorage["login"] || sessionStorage["login"];

            if (!loginDataJson) {
                return null;
            }

            try {
                return JSON.parse(loginDataJson);
            } catch (e) {
                return null;
            }
        };

        $rootScope.isLoggedIn = function () {
            if ($rootScope.loginData()) {
                return true;
            }
            return false;
        };

        // https://stackoverflow.com/questions/11541695/redirecting-to-a-certain-route-based-on-condition/11542936#11542936
        // register listener to watch route changes
        $rootScope.$on("$routeChangeStart", function (event, next, current) {
            if ($rootScope.loginData() == null) {
                //giriş yapmış kullanıcı yoksa
                // no logged user, we should be going to #login
                if (next.templateUrl != "pages/login.html") {       //yönlenmek üzere olunan sayfa login değilse
                    // not going to #login, we should redirect now
                    $location.path("/login");
                }
            }
        });
    });


app.controller("mainController", function ($scope, $http, $location) {
    $scope.isLoading = false;
    $scope.showLoading = function () {
        $scope.isLoading = true;
    };
    $scope.hideLoading = function () {
        $scope.isLoading = false;
    };



    $scope.token = function () {
        var loginData = $scope.loginData();
        if (!loginData) {
            return null;
        }

        return loginData.access_token;
    }

    $scope.logout = function () {
        //token ları temizle, redirecte çekeriz
        localStorage.removeItem("login");
        sessionStorage.removeItem("login");
        $location.path("/login");
    };


    $scope.ajax = function (apiUri, method, data, isAuth, successFunc, errorFunc) {
        $scope.showLoading();
        var headers = null;

        if (isAuth)
            headers = { Authorization: "Bearer " + $scope.token() };


        $http({
            url: apiUrl + apiUri,
            method: method,
            headers: headers,
            data: data
        }).then(
            function (response) {
                successFunc(response);
                $scope.hideLoading();
            },
            function (response) {
                errorFunc(response);
                $scope.hideLoading();
            }
        );
    };

    //if there is a token, this methods check , if it is still valid
    $scope.checkAuth = function () {
        if ($scope.loginData()) {
            $scope.ajax("api/Account/UserInfo", "get", null, true,
                function (response) {
                    if (response.data.Email != $scope.loginData().userName) {
                        $scope.logout();
                    }
                },
                function (response) {
                    if (response.status == 401) {
                        $scope.logout();
                    }
                });
        }
    };

    $scope.checkAuth();


});   //html den sorumlu ana controller

app.controller("loginController", function ($scope, $timeout, $location, $httpParamSerializer) {

    $scope.currentTab = "login";  //  login |  register
    $scope.messageFor = "login";  // login | register
    $scope.messageType = "info";  // success | warning |danger | info
    $scope.messages = [];  // string arrray ["message 1", "message 2"]

    $scope.registerForm = {
        //web api nin beklediği şekilde. account cont. register kısmındaki
        Email: "",
        Password: "",
        ConfirmPassword: "",
    };

    $scope.loginForm = {
        grant_type: "password",
        username: "",
        password: ""
    };

    $scope.rememberMe = false;

    $scope.error = function (data) {
        $scope.messageFor = $scope.currentTab;
        $scope.messageType = "danger";
        $scope.messages = [];
        if (data.ModelState) {
            for (var prop in data.ModelState) {
                //data.ModelState[prop][0];     //gelen nesnenin içinde ModelState diye bir nesne var , onun içinde prop lar var
                for (var index in data.ModelState[prop]) {
                    $scope.messages.push(data.ModelState[prop][index]);
                }
            }
        }
        if (data.error_description) {
            $scope.messages.push(data.error_description);
        }


    };

    $scope.success = function (message) {
        $scope.messageFor = $scope.currentTab;
        $scope.messageType = "success";
        $scope.messages = [message];

    };

    $scope.resetRegisterForm = function () {
        $scope.registerForm.Email = "";
        $scope.registerForm.Password = "";
        $scope.registerForm.ConfirmPassword = "";
    };


    $scope.resetLoginForm = function () {
        $scope.loginForm.username = "";
        $scope.loginForm.password = "";
        $scope.rememberMe = false;
    };

    $scope.$watch("currentTab", function () {
        $scope.resetLoginForm();
        $scope.resetRegisterForm();
        $scope.messages = [];
    });


    $scope.registerSubmit = function () {

        $scope.ajax("api/Account/Register", "post", $scope.registerForm, false,
            function (response) {
                $scope.resetRegisterForm();
                $scope.success("Your account has been successfully created.")
            },
            function (response) {
                $scope.error(response.data);
            }
        );

    };

    $scope.loginSubmit = function () {
        $scope.ajax("Token", "post", $httpParamSerializer($scope.loginForm), false,
            function (response) {
                //eski loginleri temizle
                localStorage.removeItem("login");
                sessionStorage.removeItem("login");
                var storage = $scope.rememberMe ? localStorage : sessionStorage;
                storage["login"] = JSON.stringify(response.data);
                //bunun üstünde yapcaz yoksa remember me yi kaybederiz

                $scope.resetLoginForm();

                $scope.success("Your login is successful. Redirecting...");
                $timeout(function () {
                    $location.path("/");
                }, 1000);

            },
            function (response) {
                console.log(response);
                $scope.error(response.data);
            }
        );
    };
});     // view /login

app.controller("appController", function ($scope, $location) {
    $scope.notes = [];
    $scope.currentNote = null;
    $scope.noteForm = {
        Id: null,
        Title: "",
        Content: "",
        CreationTime: "",
        ModificationTime: ""
    };

    $scope.getNotes = function () {
        $scope.ajax("api/Notes/List", "get", null, true,
            function (response) {
                $scope.notes = response.data;
            },
            function (response) {

            }
        );
    };

    $scope.showNote = function (event, note) {
        if (event) {
            event.preventDefault();

        }
        $scope.currentNote = note;
        $scope.noteForm = angular.copy(note);
    };

    $scope.putNote = function () {
        var data = {
            Id: $scope.noteForm.Id,
            Title: $scope.noteForm.Title,
            Content: $scope.noteForm.Content,

        };
        $scope.ajax("api/Notes/Update/" + data.Id, "put", data, true,
            function (response) {
                //run da
                $scope.update(response.data, $scope.currentNote);
            },
            function (response) {

            }
        );
    };

    $scope.postNote = function () {
        var data = {

            Title: $scope.noteForm.Title,
            Content: $scope.noteForm.Content,

        };
        $scope.ajax("api/Notes/New", "post", data, true,
            function (response) {
                //run da
                $scope.notes.push(response.data);
                $scope.showNote(null, response.data);
            },
            function (response) {

            }
        );
    };

    $scope.submitNote = function () {
        //current not varsa put note yapıcaz , yoksa post note yapıcaz
        if ($scope.currentNote) {
            $scope.putNote();
        } else {
            $scope.postNote();
        }
    };

    $scope.newNote = function () {
        $scope.currentNote = null;
        $scope.noteForm = {
            Id: null,
            Title: "",
            Content: "",
            CreationTime: "",
            ModificationTime: "",
        };
        document.getElementById("title").focus();
    };

    $scope.deleteNote = function () {
        if ($scope.currentNote) {
            $scope.ajax("api/Notes/Delete/" + $scope.currentNote.Id, "delete", null, true,
                function (response) {
                    
                    for (var i = 0; i < $scope.notes.length; i++) {
                        if ($scope.notes[i] == $scope.currentNote) {
                            //js array remove element
                            $scope.notes.splice(i, 1);
                            //currentNote gitti artık 
                            //$scope.currentNote = null;
                            $scope.newNote();
                            return;
                        }
                    }
                },
                function (response) {

                }
            );
        }

    };
    $scope.getNotes();

});     //view  /app

// JQuery Document Ready
$(function () {
    $(".navbar-login a").click(function (event) {
        event.preventDefault();
        var href = $(this).attr("href");
        // https://getbootstrap.com/docs/4.0/components/navs/#via-javascript
        $('#pills-tab a[href="' + href + '"]').tab('show'); // Select tab by name
    });

    $('body').on('click', '#pills-tab a', function (e) {
        e.preventDefault()
        $(this).tab('show')
    });


    // https://stackoverflow.com/questions/37769900/how-to-change-a-scope-variable-outside-the-controller-in-angularjs
    // https://www.hiren.dev/2014/06/how-to-access-scope-variable-outside.html
    $('body').on('shown.bs.tab', 'a[data-toggle="pill"]', function (e) {
        //var $scope = angular.element($('[ng-controller="mainController"]')[0]).scope();
        var $scope = angular.element($('[ng-view]')[0]).scope();
        $scope.currentTab = $(e.target).attr("id") == "pills-signup-tab" ? "register" : "login";
        $scope.$apply();   // angular a haber veriyoruz. bak bir şeyler değişti seninde arayüz öğelerinde bişeyler değiştirmen gerekebilir.
        //console.log(e.target); //aktif olan pill i taşıyor
        //e.target // newly activated tab
        //e.relatedTarget // previous active tab
    })
});
