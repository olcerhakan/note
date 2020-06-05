//Jquery Version

//GLOBAL VARIABLES
// https://localhost:44371/
var apiUrl = "https://mynoteapi.hakanolcer.xyz/";

var selectedNote = null;
var selectedLink = null;

//functions
function checkLogin() {         
    //todo: Sessionstorage ve localstorage de tutulan login bilgilerine bakarak
    //login olup olmadığına karar ver ve eğer loginse uygulamayı aç
    //login değilse login/register sayfasını göster

    var loginData = getLoginData();
    if (!loginData || !loginData.access_token) {
        showLoginPage();
        return;
    }
    // is token valid ?
    ajax("api/Account/UserInfo", "GET",null,
        function (data) {
            showAppPage();
        },
        function () {
            showLoginPage();
        });


    //$.ajax({
    //    url: apiUrl + "api/Account/UserInfo",
    //    type: "GET",
    //    headers: getAuthHeader(),
    //    success: function (data) {
    //        showAppPage();
    //    },
    //    error: function () {
    //        showLoginPage();
    //    }
    //});

}
function showAppPage() {
    $(".only-logged-out").hide();
    $(".only-logged-in").show();
    $(".page").hide();

    // retrieve the notes (notları getir)
    ajax("api/Notes/List", "GET",null,
        function (data) {
            console.log(data);

            $("#notes").html("");
            for (var i = 0; i < data.length; i++) {
                //her birinin içine ekle
                //var a= document.createElement("a");   jQuery version
                addMenuLink(data[i]);
            }

            //show page when it's ready
            $("#page-app").show();
        },
        function () {

        });
  
}

function addMenuLink(note, isActive = false) {
    var a = $("<a />")      //elementi oluştur
        .attr("href", "#")
        .addClass("list-group-item list-group-item-action show-note")     //class ekle
        .text(note.Title)                                    //metnini ekle
        .prop("note", note);                                 //oluştur

    if (isActive) {
        $(".show-note").removeClass("class");
        a.addClass("active");
        selectedLink = a.get(0);
        selectedNote = note;


    }
    $("#notes").prepend(a);

}
function showLoginPage() {
    $(".only-logged-in").hide();
    $(".only-logged-out").show();
    $(".page").hide();
    $("#page-login").show();
}

function getAuthHeader() {
    return { Authorization: "Bearer " + getLoginData().access_token };
}

function ajax(url, type,data, successFunc, errorFunc) {
    $.ajax({
        url: apiUrl + url,
        type: type,
        data:data,
        headers: getAuthHeader(),
        success: successFunc,
        error: errorFunc
    });
}

function addNote() {
    ajax("api/Notes/New", "POST",
        { Title: $("#title").val(), Content: $("#content").val() },
        function (data) {
            addMenuLink(data, true);
        },
        function () {

        }
    );
}

function updateNote() {
    ajax("api/Notes/Update/" + selectedNote.Id, "PUT",
        { Id: selectedNote.Id, Title: $("#title").val(), Content: $("#content").val() },
        function (data) {
            selectedLink.note = data;
            selectedLink.textContent = data.Title;
            //$(selectedLink).text(data.Title);
        },
        function () {

        }
    );
}

function getLoginData() {
    //todo: sessionstorage da, eğer orada bulamadıysan
    //localstorage da kayıtlı login data yı json'dan object'e dönüştür ve yolla
    //eğer yoksa null yolla
    //s.storage da login diye bir data varsa
    var json = sessionStorage["login"] || localStorage["login"];
    if (json) {
        try {
            return JSON.parse(json)
        } catch (e) {
            return null;
        }      
    }
    return null;
}

function success(message) {
    $(".tab-pane.active .message")
        .removeClass("alert-danger")
        .addClass("alert-success")
        .text(message)
        .show();
}

function error(modelState) {
    if (modelState) {
        var errors = [];
        for (var prop in modelState) {
            for (var i = 0; i < modelState[prop].length; i++) {
                errors.push(modelState[prop][i]);
            }
        }

        var ul = $("<ul/>");
        for (var i = 0; i < errors.length; i++) {
            ul.append($("<li/>").text(errors[i]));
        }
        $(".tab-pane.active .message")
            .removeClass("alert-success")
            .addClass("alert-danger")
            .html(ul)
            .show();
    }
}

function errorMessage(message) {
    if (message) {
        $(".tab-pane.active .message")
            .removeClass("alert-success")
            .addClass("alert-danger")
            .text(message)
            .show();
    }
}

function resetLoginForms() {
    $(".message").hide();
    $("#login form").each(function () {
        this.reset();
    });
}

function resetNoteForm() {
    selectedLink = null;
    selectedNote = null;
    $(".show-note").removeClass("active");
    $("#title").val("");
    $("#content").val("");
}

//EVENTS
$(document).ajaxStart(function () {
    $(".loading").removeClass("d-none");
});
$(document).ajaxStop(function () {
    $(".loading").addClass("d-none");
});

//  register
$("#signupform").submit(function (event) {
    event.preventDefault();
    var formData = $(this).serialize();

    $.post(apiUrl + "api/Account/Register", formData, function (data) {
        resetLoginForms();
        success("Your account has been successfully created.");
    }).fail(function (xhr) {
        error(xhr.responseJSON.ModelState);
    });

});

//  login
$("#signinform").submit(function (event) {
    event.preventDefault();
    var formData = $(this).serialize();

    $.post(apiUrl + "Token", formData, function (data) {

        //remember me mi ?
        //json nesnesini js ye çevirir
        var datastr = JSON.stringify(data);

        if ($("#signinrememberme").prop("checked")) {
            sessionStorage.removeItem("login");
            localStorage["login"] = datastr;
        } else {
            localStorage.removeItem("login");
            sessionStorage["login"] = datastr;
        }


        resetLoginForms();
        success("Your have been logged in successfully. Redirecting..");

        setTimeout(function () {
            resetLoginForms();
            showAppPage();
        }, 1000);
    }).fail(function (xhr) {
        errorMessage(xhr.responseJSON.error_description);
    });

});


// https://getbootstrap.com/docs/4.0/components/navs/#events
$('#login a[data-toggle="pill"]').on('shown.bs.tab', function (e) {
    // e.target // newly activated tab
    // e.relatedTarget // previous active tab

    resetLoginForms();
});

$(".navbar-login a").click(function (event) {
    event.preventDefault();
    var href = $(this).attr("href");

   //https://getbootstrap.com/docs/4.0/components/navs/#via-javascript

    $('#pills-tab a[href="' + href + '"]').tab('show'); // Select tab by name

});

//  logout
$("#btnLogout").click(function (event) {
    event.preventDefault();
    resetNoteForm();
    sessionStorage.removeItem("login");
    localStorage.removeItem("login");
    showLoginPage();
})

$("body").on("click", ".show-note", function (event) {
    event.preventDefault();
    selectedNote = this.note;
    selectedLink = this;

    $("#title").val(selectedNote.Title);
    $("#content").val(selectedNote.Content);

    $(".show-note").removeClass("active");
    $(this).addClass("active");
});

$(".add-new-note").click(function () {
    resetNoteForm();
});

$("#frmNote").submit(function (event) {
    event.preventDefault();

    //routing
    if (selectedNote) {
        updateNote();
    } 
    else {
        addNote();  //ajax isteği gönderen metot
    }
})

// delete note
$("#btnDelete").click(function () {
    if (selectedNote) {
        if (confirm("Are you sure to delete the selected note?")) {
            ajax("api/Notes/Delete/" + selectedNote.Id, "DELETE", null,
                function (data) {
                    $(selectedLink).remove();
                    resetNoteForm();
                },
                function () {

                }
            );
        }
    }
    else {
        if (confirm("Are you sure to delete the draft?")) {
            resetNoteForm();
        }
    }
});

//ACTIONS
checkLogin();