function Api(method, url, callback, data, raw) {
  url = 'https://api.github.com' + url;
  url += ((/\?/).test(url) ? '&' : '?');
  url += '&' + (new Date()).getTime();

  if(data && Object.keys(data).length > 1){
    data = JSON.stringify(data)
  }
  
  $.ajax({
    type: method,
    url: url,
    data: data,
    dataType: 'json',
    beforeSend: function(xhrObj){
      xhrObj.setRequestHeader('Accept','application/vnd.github.v3+json');
      xhrObj.setRequestHeader('Content-Type','application/json;charset=UTF-8');
      xhrObj.setRequestHeader('Authorization', 'token ' + $.trim(AccessToken));
    },
    success: function(data) {
      callback(data)
    },
    error: function(data, argument2, argument3) {
      callback(data.status);
    }
  });
  
}
//Current user
  function CurrentUser(callback) {
    Api('GET', '/user', callback);
  };

//Show Repos
  function Repos(callback) {
    Api('GET', '/user/repos?type=public', callback);
  };

//Show Tree
  function Tree(branch, callback){
    Api('GET', RepoPath + 'git/trees/' + branch, function(data) {
      callback(data.tree);
    });
  }

//Show Folders Content
  function Content(path, branch, callback) {
    Api('GET', RepoPath + 'contents' + (path ? '/' + encodeURI(path) : ''), callback, { ref: branch });
  };

//Show Files Content
  function Read(path, branch, callback) {
    Api('GET', RepoPath + 'contents/' + encodeURI(path) + '?ref=' + branch, function(data){
    	callback(window.atob(data.content));
    });
  };

//Get Sha
  function Sha(path, branch, callback) {
    Api("GET", RepoPath + "contents/" + path + "?ref=" + branch, function(data) {
      if(data === 403){
        cut = path.lastIndexOf('/');
        fname = path.substring(cut + 1);
        findIn = decodeURI(path).replace('/' + fname, ''); 
        Content(findIn, branch, function(data){ 
          $.each(data, function( index, value ){
            if(value.path === decodeURI(path)){
              callback(value.sha);
            }
          });
        });
      }else if(data === 404){
        callback(data);
      }else{
        callback(data.sha);
      }
    });
  };

//Update files
  function Write(path, branch, content, CommitMsg, callback) {
    Sha(encodeURI(path), branch, function(data) {
      Api("PUT", RepoPath + "contents/" + encodeURI(path), callback, {
        message: CommitMsg,
        content: content,
        branch: branch,
        sha: data
      });
    });
  };

//Create files
  function Create(path, branch, content, CommitMsg, callback) {
    Api("PUT", RepoPath + "contents/" + encodeURI(path), callback, {
      message: CommitMsg,
      content: content,
      branch: branch
    });
  };

//Remove files
  function Delete(path, branch, callback) {
    Sha(encodeURI(path), branch, function(data) {
      Api('DELETE', RepoPath + 'contents/' + encodeURI(path), callback, {
        message: path + ' is removed',
        sha: data,
        branch: branch
      });
    });
  };

//Rename
  function Rename(path, newName, callback){
    Api('PATCH', path, callback, {
      name: newName,
    });
  }
  
//Fork
  function Fork(forkUser, forkRepo, callback) {
    Api('POST', '/repos/' + forkUser + '/' + forkRepo + '/forks', callback);
  };

//Toggle sidebar
	$('#toggle').click(function() {
	  $('body').toggleClass('toggled');
	  $('header + div').toggleClass('row');
	});

//Back button
	$('#back').click(function(){
		if($('header .breadcrumb').children().length === 1){
			ShowWebsites();
		}else{
			$('header .breadcrumb span:last-child span').trigger('click');
		}
	});


var UserLogin; 
var UserAvatar; 
var UserHtmlUrl;
var UserUrl;
var UserId;
var PublicRepos;
var ReposUrl;
var RepoName;
var RepoPath;
var RepoOwner;
var RepoBranch;
var RepoUrl;
var CommitMsg = 'Changes made by ';
var SaveBtn = '<button type="button" class="btn btn-success" disabled></button>'; //button for when file is up to date
var ElementName;
var ElementPath;
var CurrentImagesPath = imagesPath;
var InsertImage = '';
var SelectedImages = [];
var FrontMatter = false;
var HtmlContents;
var MdContents;
var FilesToDelete = [];
		
//Get current user info
	CurrentUser(function(data) {
		if(data.name === null){
			_displayName = data.login;
		}else{
			_displayName = data.name;
		}
		UserLogin = data.login;
		UserAvatar = data.avatar_url;
		UserHtmlUrl = data.html_url;
		UserUrl = data.url;
		UserId = data.id;
		PublicRepos = data.public_repos;
		ReposUrl = data.repos_url;
		$(".avatar").attr('src', UserAvatar);
		$(".user-name").html('<a src="' + UserHtmlUrl + '">' + _displayName + '</a>');
		$('#commit').attr('placeholder', CommitMsg + UserLogin);
		ShowWebsites();
		$('.loading, body > .noclick').toggle();
	});

//Show user websites
	function ShowWebsites() {
		RepoName = '';
		RepoPath = '';
		RepoOwner = '';
		RepoBranch = '';
		ElementName = '';
		ElementPath = '';
		FrontMatter = '';
		HtmlContents = ''
		MdContents = ''
		SelectedImages = [];
		FilesToDelete = [];
		if($('.loading').is(":hidden")){
			$('.loading, .noclick').toggle();
		}
		$('header .title').text('My websites').removeAttr('data-site');
		$('header .url, aside .list .title, aside .list ul, main .content, main .images').empty();
		$('body').attr('data-content', 'sites').attr('data-images', '0');
		$('.breadcrumb .fa-home').nextAll().remove();
		
			
			Repos(function(data) {
				_totalPages = 0;
				_totalRepos = data.length;
				$.each(data, function( index, value ) {
					if(value.has_pages === true){ //If the repo has gh pages
		      	if(value.name === UserLogin.toLowerCase() + '.github.io'){ //If the repo name is the UserLogin followed by .github.io it's a user page, else it's a repo page
		      		_url = value.html_url;
		      		_repoUrl = value.name;
		      		_branch = 'master'
		      	}else {
		      		_url = value.html_url + '/tree/gh-pages';
		      		_repoUrl = UserLogin.toLowerCase() + '.github.io' + '/' + value.name;
		      		_branch = 'gh-pages'
		      	}
		      	$('main .content').append('<div class="card"><div class="card-block"><a href="' + _url + '" target="_blank"><i class="fa fa-github-square"></i></a> ' + value.name + '</div><div data-site="' + value.name + '" data-owner="' + value.owner.login + '" data-branch="' + _branch + '" data-url="' + _repoUrl + '" class="card-footer">Manage <i class="fa fa-arrow-circle-o-right"></i></div></div>');
		      	_totalPages += 1;
		      }
		    });
				$('aside .my-websites .label').text(_totalPages);
				if(_totalRepos < 1){
					$('main .content').append('<div class="alert alert-danger" role="alert"><strong>Oh oh!</strong> It seems like there are no public repositories in your account. Meet Hyde only tracks pubic repositories because websites are meant to be public right?"</div>');
				}else if(_totalPages < 1){
					$('main .content').append('<div class="alert alert-danger" role="alert"><strong>Oh oh!</strong> It seems like there are no websites in any of your repositories. Meet Hyde only tracks repositories with "gh-pages" branches and user pages which are repositories named this way: "user-name.github.io"</div>');
				}
				if($('.loading').is(":visible")){
					$('.loading, .noclick').toggle();
				}
			});
		
			
		
		//Append option to create a new website (in progress)
			//$('main .content').append('<div id="fork" class="card" data-toggle="modal" data-target="#Fork"><div class="card-block"><i class="fa fa-plus-circle"></i> New</div><div class="card-footer">Create a new website <i class="fa fa-arrow-circle-o-right"></i></div></div>');
	}

	//Call the function (its called on load or on click of .my-websites)
		$('.my-websites').click(function(){
			ShowWebsites();
			if($(this).hasClass('fa')){//if .my-websites has class .fa its the home icon on the breadcrumb so delete all after it
				$(this).nextAll().remove();
			}
		});

//Show the tree for a website
	function Root(_repoName, _repoOwner, _repoBranch, _repoUrl, _showPages ){
		FrontMatter = '';
		HtmlContents = ''
		MdContents = ''
		ElementName = '';
		ElementPath = '';
		SelectedImages = [];
		FilesToDelete = [];
		ShowPages = _showPages;
		RepoName = _repoName;
		RepoOwner = _repoOwner;
		RepoPath = '/repos/' + RepoOwner + '/' + RepoName + '/';
		RepoBranch = _repoBranch;
		RepoUrl = _repoUrl;
		$('body').attr('data-images', '0');
		$('main .content, main .images, aside ul, #FTitle').empty(); //empty content, aside list and title
		$('.loading, .noclick').toggle(); //toggle the loader
		$('body').attr('data-content', 'dir'); //Change the body data-content attribute
		$('.title').text(RepoName).attr('data-site', RepoName).attr('data-branch', RepoBranch).attr('data-url', RepoName);
		//if(!_showPages){
		//	$('header .url').html('(<a href="http://' + RepoUrl + '" target="_blank">' + RepoUrl + '</a>)'); //Update url on header
		//}
		

		//Create DS_Store file to prevent default images folder deletion
			_DsExist = 0;
			Content(imagesPath, RepoBranch, function(data) { //Get the cotents of the folder
				$.each(data, function( index, value ){ //Iterate through the contents object
					if(value.path.match('.DS_Store$')){ //Display inner files and folders except for the .DS_Store file
						_DsExist += 1;
					}
				});
				if (_DsExist === 0){
					Create(imagesPath + '/.DS_Store', RepoBranch, window.btoa(' '), 'DS_Store created' , function(data) {});
				}
			});
			
		Tree(RepoBranch, function(data) { 
			$.each(data, function( index, value ) {
				//this files are not shown in root but in the pages folder
				if (value.path.match('.md$') && value.path !== 'README.md' || value.path.match('.html$') || value.path.match('.htm$') || value.path === '.DS_Store' || value.path === '_site') {
					if(_showPages){//if the function received the _showPages argument its meant to show the pages folder so we display these files
						$('#FTitle').text('Pages');
						if(value.path.match('.md$') && value.path !== 'README.md' || value.path.match('.html$') || value.path.match('.htm$')){
							$('main .content').append('<div class="card" data-icon="' + value.type + '" ><div class="card-block"><i class="fa"> </i><div class="options"><span class="delete" data-path="' + value.path + '">delete</span></div></div><div class="card-footer" data-type="' + value.type + '" data-path="' + value.path + '" data-name="' + value.path + '" >' + value.path + ' <i class="fa"></i></div></div>');
						}
					}
				}else { //Display remaining files on the content and sidebar
					if(!_showPages){
						$('main .content').append('<div class="card" data-icon="' + value.type + '" ><div class="card-block"><i class="fa"> </i><div class="options"><span class="delete" data-path="' + value.path + '">delete</span></div></div><div class="card-footer" data-type="' + value.type + '" data-path="' + value.path + '" data-name="' + value.path + '" >' + value.path + ' <i class="fa"></i></div></div>');
					}
					$('aside ul').append('<li data-type="' + value.type + '" data-path="' + value.path + '" data-name="' + value.path + '"><i class="fa"></i> ' + value.path + '</li>');
					$('aside ul').each(function () {// reorder list, show files first
				    $('[data-type="blob"]', this).prependTo(this);
				    $('[data-type="tree"]', this).appendTo(this);
					});
				}

				//if (value.path === 'CNAME') { //Display domain name in header
				//	Read('CNAME', RepoBranch, function(data) {
				//		if(data.indexOf('.') != -1){
				//			$('header .url').html('(<a href="http://' + data + '" target="_blank">' + data + '</a>)');
				//		}
				//	});
				//}
			});

			//Create the pages links
				if(!_showPages){
					$('main .content').append('<div class="card" data-icon="tree" ><div class="card-block"><i class="fa"> </i></div><div class="card-footer" data-site="' + RepoName +'" data-owner="' + RepoOwner + '" data-branch="' + RepoBranch + '" data-pages="' + true + '">Pages <i class="fa"></i></div></div>');
				}
				$('aside ul').append('<li data-site="' + RepoName +'" data-owner="' + RepoOwner + '" data-branch="' + RepoBranch + '" data-url="'+ RepoName + '" data-pages="' + true + '"><i class="fa fa-folder-open-o"></i> Pages</li>');

			$('.loading, .noclick').toggle();
		});
	}
	//Call the function (Header repo name, sidebar repo name, breadcrumb repo name)
		$('body').on('click', '[data-site]', function(){
			$('.breadcrumb .fa-home').nextAll().remove();
			if($(this).attr('data-pages')){
				$('.breadcrumb').append('<span class="repo"><i class="fa fa-angle-double-right"></i> <span data-site="' + RepoName + '" data-owner="' + RepoOwner + '" data-branch="' + RepoBranch + '" data-url=' + RepoUrl + '>' + RepoName + '</span></span>');
			}
			Root($(this).attr('data-site'), $(this).attr('data-owner'), $(this).attr('data-branch'), $(this).attr('data-url'), $(this).attr('data-pages'));
		});

		
// Show folder contents
	function Open(_elementName, _elementPath){
		FrontMatter = '';
		HtmlContents = ''
		MdContents = ''
		SelectedImages = [];
		ElementName = _elementName;
		ElementPath = _elementPath;
		$('.loading, .noclick').toggle();
		if(ElementPath.indexOf(imagesPath) >= 0) {
			$('body').attr('data-images', '1').attr('data-content', 'dir');
		}else{
			$('body').attr('data-images', '0').attr('data-content', 'dir');
		}
		$('#FTitle').text(ElementName);
		$('main .content, main .images').empty();
					
		Content(ElementPath, RepoBranch, function(data) {
			if(data !== 404){//if the function retrieves contents (when deleting files if the folder is left empty the folder is deleted too so the function returns error)
				$.each(data, function( index, value ){
					if(!value.path.match('.DS_Store$')){
						if(value.path.indexOf(imagesPath) >= 0){
							if(value.type === 'dir'){
								$('main .content').append('<div class="card" data-icon="' + value.type + '"><div class="card-block"><i class="fa"></i><div class="options"><span class="delete" data-path="' + value.path + '">delete</span></div></div><div class="card-footer" data-type="' + value.type + '" data-path="' + value.path + '" data-name="' + value.name + '" >' + value.name + ' <i class="fa"></i></div></div>');
							}else{
								$('main .images').append('<div class="card image" data-name="' + value.name + '" data-path="' + value.path + '"><div class="card-block"><img src="' + value.download_url + '"><div class="options"><span class="name">' + value.name + '</span><span class="delete" data-path="' + value.path + '">delete</span></div></div></div>');
							}
						}else{
							$('main .content').append('<div class="card" data-icon="' + value.type + '"><div class="card-block"><i class="fa"></i><div class="options"><span class="delete" data-path="' + value.path + '">delete</span></div></div><div class="card-footer" data-type="' + value.type + '" data-path="' + value.path + '" data-name="' + value.name + '" >' + value.name + ' <i class="fa"></i></div></div>');
						}
					}
				});
				$('.loading, .noclick').toggle();
			}else{//in this case go to the preceding folder
				$('header .breadcrumb span:last-child span').trigger('click');
				$('.loading, .noclick').toggle();
			}
		});
	}
	//Call the function 
		$('body').on('click', '[data-type="tree"], [data-type="dir"], [data-type="breadcrumb"]', function(){
			if($(this).attr('data-type') === "tree"){
				$('.breadcrumb .fa-home').nextAll().remove();
				$('.breadcrumb').append('<span class="repo"><i class="fa fa-angle-double-right"></i> <span data-site="' + RepoName + '" data-owner="' + RepoOwner + '" data-branch="' + RepoBranch + '" data-url="' + RepoUrl + '">' + RepoName + '</span></span>');
			}else if($(this).attr('data-type') === "breadcrumb"){
				$(this).parent('.folder').nextAll().remove();
				$(this).parent('.folder').remove();
			}else{//if click in a dir
				$('.breadcrumb').append('<span class="folder"><i class="fa fa-angle-double-right"></i> <span data-type="breadcrumb" data-path="' + ElementPath + '" data-name="' + ElementName + '">' + ElementName + '</span></span>');
			}

			Open($(this).attr('data-name'), $(this).attr('data-path'));
		});

//Show file contents
	function Edit(_elementName, _elementPath, _editor){
		FrontMatter = '';
		HtmlContents = ''
		MdContents = ''
		ElementName = _elementName;
		ElementPath = _elementPath;
		$('.loading, .noclick').toggle();
		$('body').attr('data-images', '0').attr('data-content', 'file');
		$('#FTitle').text(ElementName);
		$('main .content, main .images').empty();

		Read(ElementPath, RepoBranch, function(data) {
			if(_editor === 'md'){
				if(data.substring(0, 4) === "---\n"){ //Extract Front Matter
					FrontMatter = $.trim(data.split('---')[1].split('---')[0]); 
					data = data.replace(FrontMatter , '');
					data = data.replace('---' , '');
					data = $.trim(data.replace('---' , ''));
				}else{ //Set a default Front Matter (wont be saved)
					FrontMatter = 'Replace this text with your Front Matter block.\n\n! TIP: You can skip the triple-dashed lines (---), they will be added automatically';
				}
				mdEditor(data, FrontMatter);
			}else{
				htmlEditor(data, 'main .content');
			}
			$('.loading, .noclick').toggle();
		});
	}
	//Call the function
	 	$('body').on('click', '[data-type="blob"], [data-type="file"]', function(){
	 		if($(this).attr('data-type') === "blob"){
	 			if($(this).attr('data-name') === 'CNAME' || $(this).attr('data-name').match('.yml$') || $(this).attr('data-name').match('.xml$')){
	 				$('.breadcrumb .fa-home').nextAll().remove();
					$('.breadcrumb').append('<span class="repo"><i class="fa fa-angle-double-right"></i> <span data-site="' + RepoName + '" data-owner="' + RepoOwner + '" data-branch="' + RepoBranch + '" data-url="' + RepoUrl + '">' + RepoName + '</span></span>');
		 		}
			}else if(!$(this).attr('data-name').match('.html$') && !$(this).attr('data-name').match('.md$') && !$(this).attr('data-name').match('.htm$')){
				$('.breadcrumb').append('<span class="folder"><i class="fa fa-angle-double-right"></i> <span data-type="breadcrumb" data-path="' + ElementPath + '" data-name="' + ElementName + '">' + ElementName + '</span></span>');
		 	}

	 		if($(this).attr('data-name').match('.html$') || $(this).attr('data-name').match('.md$') || $(this).attr('data-name').match('.htm$')){
	 			$('#Editors .modal-footer .btn').attr('data-type', $(this).attr('data-type')).attr('data-name', $(this).attr('data-name')).attr('data-path', $(this).attr('data-path')).attr('data-class', $(this).attr('data-class'));
	 			$('#Editors').modal('toggle');
	 		}else{
	 			Edit($(this).attr('data-name'), $(this).attr('data-path'), 'html')
	 		}
		});
		
		$('#Editors .modal-footer .btn').click(function(){
			if($(this).attr('data-type') === "blob"){
				$('.breadcrumb .fa-home').nextAll().remove();//update the breadcrumb
				$('.breadcrumb').append('<span class="repo"><i class="fa fa-angle-double-right"></i> <span data-site="' + RepoName + '" data-owner="' + RepoOwner + '" data-branch="' + RepoBranch + '" data-url="' + RepoUrl + '">' + RepoName + '</span></span>');
				if($(this).attr('data-name').match('.md$') && $(this).attr('data-name') !== 'README.md' || $(this).attr('data-name').match('.html$') || $(this).attr('data-name').match('.htm$')){
					$('.breadcrumb').append('<span class="repo"><i class="fa fa-angle-double-right"></i> <span data-site="' + RepoName + '" data-owner="' + RepoOwner + '" data-branch="' + RepoBranch + '" data-url="' + RepoUrl + '" data-pages="' + true + '">Pages</span></span>');
				}
 			}else{
				$('.breadcrumb').append('<span class="folder"><i class="fa fa-angle-double-right"></i> <span data-type="breadcrumb" data-path="' + ElementPath + '" data-name="' + ElementName + '">' + ElementName + '</span></span>');
		 	}

			Edit($(this).attr('data-name'), $(this).attr('data-path'), $(this).attr('data-editor'));
		});

//Html editor
	function htmlEditor(_data, _location){
		HtmlContents = _data;
		$(_location).html('<pre id="editor"></pre>');
		$('main .content').append('<div class="fileActions">' + SaveBtn + '</div>');
		$('.fileActions .btn').html('<i class="fa fa-check"></i> Up to date');
		editor = ace.edit("editor");
		editor.renderer.setScrollMargin(10, 10);
		editor.setOptions({
		  autoScrollEditorIntoView: true
		});
		editor.setValue(HtmlContents, -1);
		editor.getSession().setTabSize(htmlEditorTabSize);
		
		editor.on('input', function() {
			if(HtmlContents === editor.getValue()){
				$('.fileActions .btn').html('<i class="fa fa-check"></i> Up to date').attr('disabled', true);
			}else{
				$('.fileActions .btn').html('<i class="fa fa-save"></i> Save').attr('disabled', false);
			}
		});
	}

//Markdown editor
	function mdEditor(_data, _fm){
		MdContents = _data;
		$('main .content').html('<ul class="nav nav-tabs" role="tablist"><li class="nav-item"><a class="nav-link active" href="#editContent" role="tab" data-toggle="tab">Content</a></li><li class="nav-item"><a class="nav-link" href="#editFm" role="tab" data-toggle="tab">Front Matter</a></li></ul><div class="tab-content"><div role="tabpanel" class="tab-pane active" id="editContent"><textarea class="form-control" id="mdEditor"></textarea></div><div role="tabpanel" class="tab-pane" id="editFm"></div></div>');
		
		htmlEditor(_fm, '#editFm');
		
		simplemde = new SimpleMDE({ 
					element: document.getElementById("mdEditor"),
					spellChecker: false,
					tabSize: 4,
					toolbar: ["bold", "italic", "strikethrough",
										"|",
										"heading", "heading-smaller", "heading-bigger",
										"|",
										"code", "quote", "unordered-list", "ordered-list", "horizontal-rule",
										"|",
										"link",
										{
					            name: "image",
					            className: "search-image fa fa-picture-o",
					            action: searchImage,
					            title: "Insert Image",
					          },
					          {
					            name: "image2",
					            className: "insert-image fa fa-times",
					            action: _drawImage,
					            title: "Insert Image",
					          },
										"|" ,
										"side-by-side", 
										{
					            name: "expand",
					            action: mdexpand,
					            className: "expand fa fa-arrows-alt",
					            title: "Toggle Fullscreen",
			        			},
			        			"fullscreen", "preview"
			        		 ]
				});

		function _drawImage(editor) {
			var cm = editor.codemirror;
			var stat = _getState(cm);
			_replaceselection(cm, stat.image, '\n' + InsertImage + '\n' , "");
			InsertImage = "";
		}
		SimpleMDE._drawImage = _drawImage;
		SimpleMDE.prototype._drawImage = function() {
			_drawImage(this);
		};
		function _getState(cm, pos) {
			pos = pos || cm.getCursor("start");
			var stat = cm.getTokenAt(pos);
			if(!stat.type) return {};

			var types = stat.type.split(" ");

			var ret = {},
				data, text;
			for(var i = 0; i < types.length; i++) {
				data = types[i];
				if(data === "strong") {
					ret.bold = true;
				} else if(data === "variable-2") {
					text = cm.getLine(pos.line);
					if(/^\s*\d+\.\s/.test(text)) {
						ret["ordered-list"] = true;
					} else {
						ret["unordered-list"] = true;
					}
				} else if(data === "atom") {
					ret.quote = true;
				} else if(data === "em") {
					ret.italic = true;
				} else if(data === "quote") {
					ret.quote = true;
				} else if(data === "strikethrough") {
					ret.strikethrough = true;
				} else if(data === "comment") {
					ret.code = true;
				}
			}
			return ret;
		}
		function _replaceselection(cm, active, start, end) {
			if(/editor-preview-active/.test(cm.getWrapperElement().lastChild.className))
				return;

			var text;
			var startPoint = cm.getCursor("start");
			var endPoint = cm.getCursor("end");
			if(active) {
				text = cm.getLine(startPoint.line);
				start = text.slice(0, startPoint.ch);
				end = text.slice(startPoint.ch);
				cm.replaceRange(start + end, {
					line: startPoint.line,
					ch: 0
				});
			} else {
				text = cm.getSelection();
				cm.replaceSelection(start + text + end);

				startPoint.ch += start.length;
				if(startPoint !== endPoint) {
					endPoint.ch += start.length;
				}
			}
			cm.setSelection(startPoint, endPoint);
			cm.focus();
		}
	
		simplemde.value(MdContents);
		$('.editor-toolbar .fa-columns').trigger( 'click' );
		$('.fa-arrows-alt:not(.expand)').hide();
		$('main .content').wrapInner('<div id="md-editor" class="nofull" />');
		$('.editor-toolbar').append('<div class="fileActions">' + SaveBtn + '</div>');
		$('.editor-toolbar .actions').toggle();
		
		simplemde.codemirror.on("change", function(){
		  if(MdContents === simplemde.value()){
				$('.fileActions .btn').html('<i class="fa fa-check"></i> Up to date').attr('disabled', true);
			}else{
				$('.fileActions .btn').html('<i class="fa fa-save"></i> Save').attr('disabled', false);
			}
		});
	}

	//Editor full screen
		function mdexpand(){
			$('.expand').toggleClass('isactive');
			$('#md-editor').toggleClass('nofull');
			$('.editor-toolbar .actions').toggle();
		}

	//Open the image manager
		function searchImage(){
			$('#MdImage').modal('toggle');
			MdImage(imagesPath);
		}

//Md image
	function MdImage(_path){
		$('#MdImage .folders, #MdImage .files').empty();
		$('#MdImage .loading, .noclick').toggle();
		if (_path === imagesPath){$('#MdImage .breadcrumb').html('<span data-path="' + imagesPath + '">' + imagesPath + '</span>');}

		Content(_path, RepoBranch, function(data) {
			$.each(data, function( index, value ) {
	      if(value.type === "dir"){
	      	$('#MdImage .folders').append('<div class="folder" data-path="' + value.path + '"><i class="fa fa-folder-open-o"></i><div>' + value.name + '</div></div>'); 
	      }else if (value.name !== '.DS_Store'){
	      	$('#MdImage .files').append('<div class="image"><img class="cardSelect" src="' + value.download_url + '"><div class="options"><span class="name">' + value.name + '</span><span class="delete" data-path="' + value.path + '">delete</span></div><div data-name="' + value.name + '" data-url="' + value.download_url + '" class="btn btn-success btn-block"><i class="fa fa-check"></i>Add</div></div>');
	      }
	    });
			$('#MdImage .loading, .noclick').toggle();
	  });
	}

	//Attach mousewheel to horizontal folders
		$("#MdImage .folders").mousewheel(function(event, delta) {
			this.scrollLeft -= (delta * 30);
	  	event.preventDefault();
		});

	//Navigate through folders
		$('body').on('click', '#MdImage .folder, #MdImage .breadcrumb span', function(){
			CurrentImagesPath = $(this).attr('data-path');
			$('#MdImage .folders, #MdImage .files').empty();
	  	MdImage(CurrentImagesPath);
	  	if ($(this).hasClass('folder')){
	  		$('#MdImage .breadcrumb').append('<i class="fa fa-angle-double-right"></i><span class="image-path" data-path="' + CurrentImagesPath + '">' + $(this).children('div').html() + '</span>');
	  	}else{
	  		$(this).nextAll().remove();
	  	}
	  });

	//Insert images on mdeditor
		$('body').on('click', '#MdImage .image > .btn', function(){
			InsertImage = '![' + $(this).attr('data-name') + '](' + $(this).attr('data-url') + ')';
			$('.editor-toolbar .insert-image').trigger('click');
			$('#MdImage').modal('toggle');
		});
		$('body').on('click', '#insertUrl .modal-footer .btn', function(){
			InsertImage = '![](' + $('#insertUrl input').val() + ')';
			$('.editor-toolbar .insert-image').trigger('click');
			$('#MdImage').modal('toggle');
		});
	
	//Top bar
		//upload
			$('body').on('click', '#Upload', function(){
				$('#MdImage .uploader, #MdImage .folders, #MdImage .files').toggle();
			});
			//Remove image from upload que
				$('body').on('click', '.dz-remove', function(){
					$(this).closest('.dz-preview').remove();
				});
			//Close the dropbox
				$('body').on('click', '.uploader .btn-danger', function(){
					$('#MdImage .uploader, #MdImage .folders, #MdImage .files').toggle();
					$('form.dropzone .dz-preview').remove(); 
					$('form.dropzone').removeClass('dz-started');
				});
			//Upload the images
				$('body').on('click', '#MdImage .uploader .btn-success', function(){
					_imagesToUpload = ($('#MdImage .manager-drop img').length); //# of images to upload
					_augmentIn = 100 / _imagesToUpload;
					_imagesUploaded = 0;
					if (_imagesToUpload === 0) {
					  alert('There are no images to upload');
					}else {
						$('#MdImage .uploading, .noclick').toggle();
						$('#MdImage .manager-drop img').each(function(){
							_base = $(this).attr('src'); 
							_baseClean = _base.replace('data:image/png;base64,','');
							_imgName = $(this).attr('alt');
							Write(CurrentImagesPath + '/' + _imgName, RepoBranch, _baseClean, _imgName + ' uploaded', function(err) {
								$('#MdImage .uploading .progress').attr('value', parseFloat($('#MdImage .progress').attr('value')) + parseFloat(_augmentIn));
								$('#MdImage .uploading .percent').text(Math.floor(parseInt($('#MdImage .uploading .percent').prev().attr('value'))) + ' %');
								_imagesUploaded += 1;
								if(_imagesUploaded ===  _imagesToUpload){
									MdImage(CurrentImagesPath);
									$('#MdImage .uploader, #MdImage .folders, #MdImage .files').toggle();
									$('#MdImage form.manager-drop .dz-preview').remove();
									$('#MdImage form.manager-drop').removeClass('dz-started');
									$('#MdImage .uploading .progress').attr('value', '0');
									$('#MdImage .uploading .percent').text('0');
									$('#MdImage .uploading, .noclick').toggle();
								}
							});
						});
					}
				});

			//Insert from url
				$('#FromUrl').click(function(){
					$('#insertUrl').modal('toggle');
				});
				$('body').on('input', '#insertUrl input', function(){
					_imageUrl = $(this).val();
					$(this).parent().next().children().attr('src', _imageUrl);
				});
				$('#insertUrl').on('hidden.bs.modal', function () { 
				  $('#insertUrl input').val('');
				  $('#insertUrl img').attr('src', '');
				});
	
	//Clear data on close
	  $('#MdImage').on('hidden.bs.modal', function () {
		  $('#MdImage .folders, #MdImage .files, #MdImage .images').empty();
		  CurrentImagesPath = imagesPath;
		});

//Delete files
	$(document).on('click', '.options .delete', function(){
		$('#confirmDelete').modal('toggle');
		$('#confirmDelete #Confirm').attr('data-path', $(this).attr('data-path'));
	});
	$(document).on('click', '#confirmDelete #Confirm', function(){
		if(MdContents){
			$('#MdImage .deleting, .noclick').toggle(); 
		}else{
			$('main .deleting, .noclick').toggle();
		}
		Delete($(this).attr('data-path'), RepoBranch, function(err) {
			if(MdContents){
				MdImage(CurrentImagesPath);
				$('#MdImage .deleting, .noclick').toggle(); 
			}else{
				if(ElementPath){
					Open(ElementName, ElementPath);
				}
				else{
					if(ShowPages){
						Root(RepoName, RepoBranch, RepoUrl, true);
					}else{
						Root(RepoName, RepoBranch, RepoUrl);
					}
					
				}
				$('main .deleting, .noclick').toggle(); 
			}
			$('main .images').empty();
		});
  });

//Save files
	$(document).on('click', '.fileActions .btn', function(){
		$('#CommitMsg').modal('toggle');
	});
	function saveChanges(){
		if ($("#commit").val()) {
		  CommitMsg = $("#commit").val();
		}
		
		$('.fileActions .btn').html('<div class="spinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>').attr('disabled', true);//content for the button
		
		if (MdContents){//If the editing is being made with MarkDown
			if (editor.getValue().indexOf("Replace this text with your Front Matter block.") >= 0){
				_saveContent = simplemde.value();
			}else if (editor.getValue().substring(0, 4) === "---\n"){
				_saveContent = '---\n' + $.trim(editor.getValue().split('---')[1].split('---')[0]) + '\n---\n' + simplemde.value();
			}else{
				_saveContent = '---\n' + $.trim(editor.getValue()) + '\n---\n' + simplemde.value();
			}
		}else { //If the editing is being made with Html
			_saveContent = editor.getValue(); 
		}

		Write(ElementPath, RepoBranch, window.btoa(_saveContent), CommitMsg, function(data) {
			$('.fileActions .btn').html('<i class="fa fa-check"></i> Up to date');
			CommitMsg = 'Changes made by ' + UserLogin;
			HtmlContents = editor.getValue();
			if (MdContents === 'md'){
				MdContents = simplemde.value();
			}
			$("#commit").val(''); 
		});
	}

//Get current date 
	function CurrentDate(){
		var d = new Date();
		var month = d.getMonth()+1;
		var day = d.getDate();

		return d.getFullYear() + '-' +
		    (month<10 ? '0' : '') + month + '-' +
		    (day<10 ? '0' : '') + day + '-';
	}

//Create files
	$('.addfiles').on('click', function () {
		if(ElementPath){
			$('#addFile form label').text(RepoName + '/' + ElementPath + '/');
		}
		else{
			$('#addFile form label').text(RepoName);
		}
	});
	$('#addFile input').on('input', function(){
		if($(this).val().length === 0){
			$('#addFile .modal-footer').html('<button type="button" class="btn btn-success use-images" disabled><i class="fa fa-ban"></i></button>');
		}else if($(this).val().length === 1) {
			$('#addFile .modal-footer').html('<button type="button" class="create btn btn-success use-images"><i class="fa fa-check"></i> Create</button>');
		}
	});
	$('body').on('click', '#addFile .modal-footer .create', function () {
		$('#addFile .modal-footer').html('<button type="button" class="btn btn-success use-images" disabled><div class="spinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div></button>');
		if(ElementPath){
			if(ElementPath.indexOf('_posts') >= 0){
				newFile = ElementPath + '/' + CurrentDate() + $('#addFile form input').val();
			}else{
				newFile = ElementPath + '/' + $('#addFile form input').val();
			}
		}
		else{
			newFile = $('#addFile form input').val();
		}
		console.log(newFile);
		Write(newFile, RepoBranch, window.btoa(''), 'new file created', function(data) {
			$('#addFile').modal('toggle');
			if(ElementPath){
				Open(ElementName, ElementPath);
			}
			else{
				if(ShowPages){
					Root(RepoName, RepoBranch, RepoUrl, true);
				}else{
					Root(RepoName, RepoBranch, RepoUrl);
				}
				
			}
			$('#addFile .modal-footer').html('<button type="button" class="btn btn-success use-images" disabled><i class="fa fa-ban"></i></button>');
		});
	});
	$('#addFile').on('hidden.bs.modal', function () { //Clear values on modal close
	  $('#addFile .modal-footer').html('<button type="button" class="btn btn-success use-images" disabled><i class="fa fa-ban"></i></button>');
	  $('#addFile input').val('');
	});

//Upload images (folder)
	$('.addimages').on('click', function () {
	  $('#addImage form label').text(ElementPath + '/');
	});
	$('body').on('click', '#addImage .uploader .btn-success', function(){
		_currentPath = ElementPath;
		_imagesToUpload = ($('#addImage .addimage-drop img').length);
		_augmentIn = 100 / _imagesToUpload;
		_imagesUploaded = 0;
		if (_imagesToUpload === 0) {
		  alert('There are no images to upload');
		}else {
			if ($('#addImage input').val()){
				_saveIn = ElementPath + '/' + $('#addImage input').val() + '/';
			}else{
				_saveIn = ElementPath + '/';
			}
			$('#addImage, #Uploading').modal('toggle');
			$('#addImage .addimage-drop img').each(function(){
			$('.addimages').attr('disabled', true);
				_base = $(this).attr('src');
				_baseClean = _base.replace('data:image/png;base64,','');
				imgName = $(this).attr('alt');
				Create(_saveIn + imgName, RepoBranch, _baseClean, imgName + ' uploaded', function(err) {
					$('#Uploading .progress').attr('value', parseFloat($('#Uploading .progress').attr('value')) + parseFloat(_augmentIn));
					$('#Uploading .percent').text(Math.floor(parseInt($('#Uploading .progress').attr('value'))) + ' %');
					_imagesUploaded += 1;
					if(_imagesUploaded === _imagesToUpload){ 
						$('#UploadSuccess, #Uploading').modal('toggle');
						if(_currentPath === ElementPath){
							$('main .images').empty();
							Open(ElementName, ElementPath);
						}
						$('.addimages').attr('disabled', false);
						$('#addImage form.addimage-drop .dz-preview').remove();
						$('#addImage form.addimage-drop').removeClass('dz-started');
						$('#addImage .uploading .progress').attr('value', '0');
						$('#addImage .uploading .percent').text('0');
						$('#addImage input').val('')
					}
				});
			});
		}
	});
	$('#Uploading button').click(function(){
		$('#Uploading .noclick').toggle();
		$('#Uploading').toggleClass('minimized');
		$('#Uploading button i').toggleClass('fa-minus').toggleClass('fa-plus');
	});

/*/Fork repos
	$('#Fork input').on('input', function(){
		if($('#Fork .newname').val().length === 0 || $('#Fork .username').val().length === 0 || $('#Fork .reponame').val().length === 0){
			$('#Fork .modal-footer').html('<button type="button" class="btn btn-success fork" disabled><i class="fa fa-ban"></i></button>');
		}else{
			$('#Fork .modal-footer').html('<button type="button" class="create btn btn-success fork"><i class="fa fa-check"></i> Create</button>');
		}
	});

	$(document).on('click', '#Fork .btn.fork', function(){
		Fork($('#Fork .username').val(), $('#Fork .reponame').val(), function(data){
		  rename('/repos/' + data.full_name, $('#Fork .newname').val(), function(data){
		    Repos(function(data) {//data is an array of objects, each object is a repo
					$.each(data, function( index, value ) { //iterate through each data(each repo) on the data array
						if(value.name === $('#Fork .username').val() && value.has_pages === false){

						}
					});
				});
			});
		});
	});*/

//Bug alert
	$('body').append('<div class="alert alert-info alert-dismissible fade in bug" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>You are using the first release of Meet Hyde so there may be bugs, if you find something please <a href="https://github.com/MeetHyde/MeetHyde/issues" target="_blank">let us know</a>. Follow us on <a href="https://twitter.com/MeetHyde" target="_blank">twitter</a> to stay updated </div>')

