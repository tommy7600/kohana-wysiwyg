;
(function($){
  $.parentsArray = [];
  $.fn.folderTree = function(opt){
    var opt = $.extend({
      autoTurnTree : true, //auto open tree to folder which files is currently opened in browser
      container : this //don't change!
    }, opt);

    $.fn.getD = function(){
      return this.data("data");
    };

    $.fn.addSelectMarkToParent = function(){
      var parent = this.parent();
      if(parent.getD()){
        if(!parent.getD().isRoot){
          parent.getD().isParentOfSelected = true;
          parent.addSelectMarkToParent();
        }
      }
      else return this;
    };

    $.fn.processFolder = function(){
      var dir = this[0], dirP = $(dir).children("p");
      var isRoot = ($(this).attr("id") == "root") ? true : false;
      this.data("data",{
        "name" : dirP.children("a").text(),
        "isRoot" : isRoot,
        "open" : isRoot,
        "hasChild" : this.attr("name")*1,
        "lastResponce" : false,
        "filesLoaded" : false,
        "isParentOfSelected" : false,
        "folderRect" : dirP[0].getBoundingClientRect()
      });

      if(isRoot && ! $.reopen) $(this).children("p").addClass("selected");

      var dirData = $(dir).getD();
      if($(this).getD().hasChild == 0) this.children("p").treeOpenerToggleActive();
      // 'open-tree' handler binding to all folders, including empty folders because it may stay not empty by add childer folders
      // click on 'open-tree' <i> element of empty folders disabled by special overlay toggling by .chevronToggleActive() method
      $("i", this.children("p")).toggle(
        function(){ // open folder
          $(dir).addClass("process");
          var fullPath = $(dir).buildFullPath(false);
          $.getJSON(global_config.dirs_url + fullPath, function(data){
            $(dir).removeClass("process").addClass("open").getD().open = true;
            $("div", dir).remove();
            for(var dirName in data.dirs){
              if(!isNaN(data.dirs[dirName])){
                $('<div name="'+data.dirs[dirName]+'"><p><i class="icon-chevron-right"></i><a href="">'+dirName+'</a><em></em></p></div>').appendTo(dir).processFolder();
              }
            }
            if(path != "/") { // auto turn tree to selected folder
              var level = $.inArray(dirData.name, $.parentsArray);
              if(level != -1 && (dirData.isParentOfSelected || $.reopen)) {
                $(dir).children("div").each(function(){
                  if($(this).getD().name == $.parentsArray[level+1]){
                    $(this).children("p").addClass("selected").children("i").addClass("icon-white");
                    if(level+2 == $.parentsArray.length) {
                      $(this).getD().filesLoaded = true;
                    }
                    else {
                      $(this).getD().isParentOfSelected = true;
                      if(opt.autoTurnTree) $("i", this).click();
                    }
                  }
                });
              }
            }
          });

          if(dirP.hasClass("selected") && !dirData.filesLoaded){
            dirP.removeClass("selected").children("i").removeClass("icon-white");
          }
          $(document).trigger("openFolderClick", fullPath);
        },

        function(){ // close folder
          dirData.isParentOfSelected = dirData.open = false;
          $(dir).removeClass().find("div").each(function(){
            if($(this).getD().filesLoaded) {
              dirData.isParentOfSelected = true;
              dirP.addClass("selected").children("i").addClass("icon-white");
            }
            $(this).hide();
          });
          $(document).trigger("closeFolderClick");
        }
        );
      // end add handlers to click on "open/close" icon

      $("a", this.children("p")).click(function(){ // click for files load
        path = $(dir).buildFullPath(true);
        $.getJSON('/'+global_config.files_url+((!isRoot)? path : ''), function(data){
          $("#files-row").empty().append($("#tpl-files").tmpl(data));
          $("p", opt.container).removeClass("selected").children("i").removeClass("icon-white");
          $(opt.container).find("div").each(function(){
            $(this).getD().isParentOfSelected = false;
            $(this).getD().filesLoaded = false;
          });
          dirP.addClass("selected").children("i").addClass("icon-white");

          dirData.filesLoaded = true;
          $(dir).addSelectMarkToParent();
          $("#breadcrumb").breadcrumbUpdate(); // method defined in global.js
        });
        // put path to local storage for save current folder and re-open by filebrowser reload
        localStorage.setItem("filebrowserCurrentfolder", path);
        return false;
      });


      // drag-n-drop events handlers (not to drag folders but to recive files dropped over this folder)
 //     this.children("p").on($.foldersDragDropHandlers);
    }; // end of prosessFolder()

    $("div",this).each(function(){
      $(this).processFolder();
    });

    return this;
  };

  // public methods of folders tree

  $.fn.buildFullPath = function(refreshParentsArray){
    var pathTxt = '';
    var parent = function(folder){
      if(!folder.data("data").isRoot){
        pathTxt = folder.data("data").name+ "/" + pathTxt;
        parent(folder.parent());
      }
      else return;
    };
    parent(this);
    if(refreshParentsArray) {
      $.parentsArray = pathTxt.split("/");
      $.parentsArray.pop();
    }
    return "/" + pathTxt;
  };

  $.fn.addFolder = function(){ // use for parent of created directory in global.js
    var dirData = this.getD(), p = this.children('p');
    if(p.hasClass('noChild')) p.treeOpenerToggleActive().children('i').click();
    else if (dirData.open) p.children('i').click().click();
         else p.children('i').click();
    dirData.hasChild++;
  }

  $.fn.renameFolder = function(name){ // use for renamed directory for change name immidiatly
    var dirData = this.getD();
    dirData.name = name;
    $("a", this.children("p")).text(name);
    if(dirData.filesLoaded) {
      path = $(this).buildFullPath(true);
      $("#breadcrumb").breadcrumbUpdate();
    }
    if(dirData.isParentOfSelected) {
      this.find("div").each(function(){
        if($(this).getD().filesLoaded){
          path = $(this).buildFullPath(true);
          $("#breadcrumb").breadcrumbUpdate();
        }
      });
    }
  }

  $.fn.treeOpenerToggleActive = function() { // use for <p> folder element
    if(this.hasClass('noChild')){
      this.removeClass('noChild').children("strong.disableOpen").remove();
    }
    else {
      var opener = this.children('i');
      this.addClass('noChild');
      $('<strong/>', {
        'class' : 'disableOpen',
        'css' : {
          'width' : opener.width() + 'px',
          'left'  : opener.position().left + 'px'
        }
      }).appendTo(this);
    }
    return this;
  }

})(jQuery);