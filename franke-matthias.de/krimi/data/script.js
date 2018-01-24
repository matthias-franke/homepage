var imgSrcActive = "bani.gif"
var imgSrcVisited = "bblack.gif"
var visited = "visited";
var active = "active";

function setImgSrcActive(id)
{
  if(top == self){
    top.location = "../index.html";
  }
//  if(parent == null){
//    document.location = "../index.html";
//  }
  else{
    if(parent && parent.navi && parent.navi.document){
      parent.navi.document.getElementById(id).setAttribute("src", imgSrcActive);
      parent.navi.document.getElementById(id).setAttribute("alt", active);
    }
  }
}

function setImgSrcVisited(id)
{
  if(parent && parent.navi && parent.navi.document){
    parent.navi.document.getElementById(id).setAttribute("src", imgSrcVisited);
    parent.navi.document.getElementById(id).setAttribute("alt", visited);
  }
}