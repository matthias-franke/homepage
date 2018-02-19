
var imgSrcActive = "bani.gif"
var imgSrcVisited = "bblack.gif"
var imgSrcPassive = "btrans.gif"
var visited = "visited";
var active = "active";
var passive = "passive";
var timeout = (new Date((new Date()).getTime() + (1000*60*60*24*365))).toGMTString();
var save = "true";

docus = new Array(
 "-005-008","-004-008","-003-008","-002-008","-001-008","+000-008","+001-008","+002-008","+003-008","+004-008","+005-008","+006-008","+007-008","+008-008",
 "-005-007","-004-007","-003-007","-002-007","-001-007","+000-007","+001-007","+002-007","+003-007","+004-007","+005-007","+006-007","+007-007","+008-007",
 "-005-006","-004-006","-003-006","-002-006","-001-006","+000-006","+001-006","+002-006","+003-006","+004-006","+005-006","+006-006","+007-006","+008-006",
 "-005-005","-004-005","-003-005","-002-005","-001-005","+000-005","+001-005","+002-005","+003-005","+004-005","+005-005","+006-005","+007-005","+008-005",
 "-005-004","-004-004","-003-004","-002-004","-001-004","+000-004","+001-004","+002-004","+003-004","+004-004","+005-004","+006-004","+007-004","+008-004",
 "-005-003","-004-003","-003-003","-002-003","-001-003","+000-003","+001-003","+002-003","+003-003","+004-003","+005-003","+006-003","+007-003","+008-003",
 "-005-002","-004-002","-003-002","-002-002","-001-002","+000-002","+001-002","+002-002","+003-002","+004-002","+005-002","+006-002","+007-002","+008-002",
 "-005-001","-004-001","-003-001","-002-001","-001-001","+000-001","+001-001","+002-001","+003-001","+004-001","+005-001","+006-001","+007-001","+008-001",
 "-005+000","-004+000","-003+000","-002+000","-001+000","+000+000","+001+000","+002+000","+003+000","+004+000","+005+000","+006+000","+007+000","+008+000",
 "-005+001","-004+001","-003+001","-002+001","-001+001","+000+001","+001+001","+002+001","+003+001","+004+001","+005+001","+006+001","+007+001","+008+001",
 "-005+002","-004+002","-003+002","-002+002","-001+002","+000+002","+001+002","+002+002","+003+002","+004+002","+005+002","+006+002","+007+002","+008+002",
 "-005+003","-004+003","-003+003","-002+003","-001+003","+000+003","+001+003","+002+003","+003+003","+004+003","+005+003","+006+003","+007+003","+008+003",
 "-005+004","-004+004","-003+004","-002+004","-001+004","+000+004","+001+004","+002+004","+003+004","+004+004","+005+004","+006+004","+007+004","+008+004",
 "-005+005","-004+005","-003+005","-002+005","-001+005","+000+005","+001+005","+002+005","+003+005","+004+005","+005+005","+006+005","+007+005","+008+005",
 "-005+006","-004+006","-003+006","-002+006","-001+006","+000+006","+001+006","+002+006","+003+006","+004+006","+005+006","+006+006","+007+006","+008+006",
 "-005+007","-004+007","-003+007","-002+007","-001+007","+000+007","+001+007","+002+007","+003+007","+004+007","+005+007","+006+007","+007+007","+008+007"
);

function setImgSrcActive(id)
{
  parent.navi.document.getElementById(id).setAttribute("src", imgSrcActive);
  parent.navi.document.getElementById(id).setAttribute("alt", active);
}

function setImgSrcVisited(id)
{
  parent.navi.document.getElementById(id).setAttribute("src", imgSrcVisited);
  parent.navi.document.getElementById(id).setAttribute("alt", visited);
}

function setImgSrcPassive(element)
{
  element.setAttribute("src", imgSrcPassive);
  element.setAttribute("alt", passive);
}


function savePath()
{
  if(save == "true"){
    var activeDoc = "HomePage";
    var visitedDocs = "";
    for(var i = 0; i < docus.length; i++){
      if(document.getElementById(docus[i]).getAttribute("alt") == visited){
        //alert(docus[i] + " | " + parent.navi.document.getElementById(docus[i]).getAttribute("alt"));
        visitedDocs = visitedDocs + docus[i] + ",";
      }
      else{
        if(document.getElementById(docus[i]).getAttribute("alt") == active){
          //alert(docus[i] + " | " + parent.navi.document.getElementById(docus[i]).getAttribute("alt"));
          activeDoc = docus[i];
        }
      }
    }
    //alert("Act: " + activeDoc);
    document.cookie = visitedDocs + activeDoc + "; expires=" + timeout + ";";
  }
}

function setSavedPath()
{
  if(document.cookie){
    var id = "HomePage";
    //alert(parent.navi.document.cookie.toString());
    for(var i = 0; i < document.cookie.length; i = i + 9){
      //var i = document.cookie.indexOf("=") + 1
      id = document.cookie.substring(i,i+8);
      //alert(id);
      setImgSrcVisited(id);
    }
    setImgSrcActive(id);
    parent.cont.document.location.href = "v" + id + ".html";
  }
}

function resetPath()
{
  document.cookie = "";
  parent.cont.document.location.href = "vHomePage.html";
  save = "false";
  document.location.href = "vNavigation.html";
}