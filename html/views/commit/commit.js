/* Commit: Interface for selecting, staging, discarding, and unstaging
   hunks, individual lines, or ranges of lines.  */

var showNewFile = function(file)
{
	setTitle("New file: " + file.path);

	var contents = IndexController.unstagedChangesForFile_(file);
	if (!contents) {
		notify("Can not display changes (Binary file?)", -1);
		diff.innerHTML = "";
		return;
	}

	diff.innerHTML = "<pre>" + contents.escapeHTML() + "</pre>";
	diff.style.display = '';
}

var hideState = function() {
	$("state").style.display = "none";
}

var setState = function(state) {
	setTitle(state);
	hideNotification();
	$("state").style.display = "";
	$("diff").style.display = "none";
	$("state").innerHTML = state.escapeHTML();
}

var setTitle = function(status) {
	$("status").innerHTML = status;
	$("contextSize").style.display = "none";
	$("contextTitle").style.display = "none";
}

var displayContext = function() {
	$("contextSize").style.display = "";
	$("contextTitle").style.display = "";
}

var showFileChanges = function(file, cached) {
	if (!file) {
		setState("No file selected");
		return;
	}

	hideNotification();
	hideState();

	$("contextSize").oninput = function(element) {
		Controller.setContextSize_($("contextSize").value);
	}

	if (file.status == 0) // New file?
		return showNewFile(file);

	var changes;
	if (cached) {
		setTitle("Staged changes for " + file.path);
		displayContext();
		changes = IndexController.stagedChangesForFile_(file);
	}
	else {
		setTitle("Unstaged changes for " + file.path);
		displayContext();
		changes = IndexController.unstagedChangesForFile_(file);
	}

	if (changes == "") {
		notify("This file has no more changes", 1);
		return;
	}

	displayDiff(changes, cached);
}

/* Set the event handlers for mouse clicks/drags */
var setSelectHandlers = function()
{
	document.onmousedown = function(event) {
		if(event.which!=1) return false;
		deselect();
		currentSelection=false;
	}
	document.onselectstart = function () {return false;}; /* prevent normal text selection */
    
	var list = document.getElementsByClassName("lines");

	document.onmouseup = function(event) { 
		// Handle button releases outside of lines list 
		for (i = 0; i < list.length; ++i) {
			file=list[i];
			file.onmouseover=null;
			file.onmouseup=null;
		}
	}

	for (i = 0; i < list.length; ++i) {
		var file = list[i];
		file.ondblclick = function (event) {
			var file=event.target.parentNode;
			if (file.id = "selected") 
				file=file.parentNode;
			var start=event.target;
			var cls=start.getAttribute("class");
			if(!cls || !(cls=="addline" | cls=="delline")) return false; 
			deselect();
			var bounds=findsubhunk(start);
			showSelection(file,bounds[0],bounds[1],true);
			return false;
		};
	
		file.onmousedown = function(event) {
			if (event.which!=1) return false;
			var cls=event.target.getAttribute("class")
			event.stopPropagation();
			if (cls == "hunkheader" || cls == "hunkbutton") 
				return false;

			var file=event.target.parentNode;
			if (file.id && file.id=="selected") 
				file=file.parentNode;
	    
			file.onmouseup = function(event) {
				file.onmouseover = null;
				file.onmouseup = null;
				event.stopPropagation();
				return false;
			};
	
			if (event.shiftKey && currentSelection) { // Extend selection
				var index=parseInt(event.target.getAttribute("index"));
				var min=parseInt(currentSelection.bounds[0].getAttribute("index"));
				var max=parseInt(currentSelection.bounds[1].getAttribute("index"));
				var ender=1;
				if(min>max) {
					var tmp=min; min=max; max=tmp;
					ender=0;
				} 
						
				if (index < min)
					showSelection(file,currentSelection.bounds[ender],
						      event.target);
				else if (index > max)
					showSelection(file,currentSelection.bounds[1-ender],
						      event.target);
				else showSelection(file,currentSelection.bounds[0],event.target);
				return false;
			}
						
						
			file.onmouseover = function(event2) {
				showSelection(file, event.srcElement, event2.target);
				return false;
			};
			showSelection(file, event.srcElement, event.srcElement);
			return false;
		}
	}
}


var diffHeader;
var originalDiff;
var originalCached;

var displayDiff = function(diff, cached)
{
	diffHeader = diff.split("\n").slice(0,4).join("\n");
	originalDiff = diff;
	originalCached=cached;

	$("diff").style.display = "";
	highlightDiff(diff, $("diff"));
	hunkHeaders = $("diff").getElementsByClassName("hunkheader");

	for (i = 0; i < hunkHeaders.length; ++i) {
		var header = hunkHeaders[i];
		if (cached)
			header.innerHTML = "<a href='#' class='hunkbutton' onclick='addHunk(this, true); return false'>Unstage</a>" + header.innerHTML;
		else {
			header.innerHTML = "<a href='#' class='hunkbutton' onclick='addHunk(this, false); return false'>Stage</a>" + header.innerHTML;
			header.innerHTML = "<a href='#' class='hunkbutton' onclick='discardHunk(this, event); return false'>Discard</a>" + header.innerHTML;
		}
	}
	setSelectHandlers();
}

var getNextText = function(element)
{
	// gets the next DOM sibling which has type "text" (e.g. our hunk-header)
	next = element;
	while (next.nodeType != 3) {
		next = next.nextSibling;
	}
	return next;
}

var getHunkText = function(hunk)
{
	hunk = getNextText(hunk);
	hunkHeader = hunk.data.split("\n")[0];
	if (m = hunkHeader.match(/@@.*@@/))
		hunkHeader = m;

	start = originalDiff.indexOf(hunkHeader);
	end = originalDiff.indexOf("\n@@", start + 1);
	end2 = originalDiff.indexOf("\ndiff", start + 1);
	if (end2 < end && end2 > 0)
		end = end2;

	if (end == -1)
		end = originalDiff.length;

	var hunkText = originalDiff.substring(start, end);
	hunkText = diffHeader + "\n" + hunkText + "\n";

	return hunkText;
}

var addHunk = function(hunk, reverse)
{
	var hunkText = getHunkText(hunk);

	if (Controller.stageHunk_reverse_)
		Controller.stageHunk_reverse_(hunkText, reverse);
	else
		alert(hunkText);
}

var discardHunk = function(hunk, event)
{
	var hunkText = getHunkText(hunk);

	if (Controller.discardHunk_altKey_) {
		Controller.discardHunk_altKey_(hunkText, event.altKey == true);
	} else {
		alert(hunkText);
	}
}

/* Find all contiguous add/del lines. A quick way to select "just this
 * chunk". */
var findsubhunk = function(start) {
	var bounds=[false,false];
	for (var b=0; b <= 1 ; ++b) {
		var place=start;
		var move=b?"nextSibling":"previousSibling";
		for(var next=place[move]; next; next=next[move]) {
			var cls=next.getAttribute("class");
			if(cls=="hunkheader" || cls=="noopline") break;
			place=next; // It's a good position
		}
		bounds[b]=place;
	}
	return bounds;
}

/* Remove existing selection */
var deselect = function() {
	var selection = document.getElementById("selected");
	if (selection) {
		while (selection.childNodes[1])
			selection.parentNode.insertBefore(selection.childNodes[1], selection);
		selection.parentNode.removeChild(selection);
	}
}
  
/* Stage individual selected lines.  Note that for staging, unselected
 * delete lines are context, and v.v. for unstaging. */
var stageLines = function(reverse) {
	var selection = document.getElementById("selected");
	if(!selection) return false;
	currentSelection=false;
	var hunkHeader=false;
	var preselect=0,cls;

	for(var next=selection.previousSibling; next; next=next.previousSibling) {
		cls=next.getAttribute("class");
		if(cls=="hunkheader") {
			hunkHeader=next.lastChild.data;
			break;
		}
		preselect++;
	}

	var sel_len=selection.children.length-1;

	if (!hunkHeader) return false;
	
	var subhunkText=getLines(hunkHeader);
	var lines=subhunkText.split('\n');
	lines.shift();  // Trim old hunk header (we'll compute our own)
	if (lines[lines.length-1] == "") lines.pop(); // Omit final newline

	var m;
	if (m = hunkHeader.match(/@@ \-(\d+)(,\d+)? \+(\d+)(,\d+)? @@/)) {
		var start_old = parseInt(m[1]);
		var start_new = parseInt(m[3]);
	} else return false;

	var patch="", cnt=[0,0];
	for (var i = 0; i < lines.length; i++) {
		var l = lines[i];
		var firstChar = l.charAt(0);
		if (i<preselect || i>=preselect+sel_len) {    // Before/after select
			if(firstChar == (reverse?'+':"-"))   // It's context now!
				l=' '+l.substr(1);
			if(firstChar != (reverse?'-':"+")) { // Skip unincluded parts
				patch+=l+"\n";
				cnt[0]++; cnt[1]++;
			}
		} else {                                      // In the selection 
			if (firstChar == '-') {
				cnt[0]++;
			} else if (firstChar == '+') {
				cnt[1]++;
			} else {
				cnt[0]++; cnt[1]++;
			}
			patch+=l+"\n";
		}
	}
	patch = diffHeader + '\n' + "@@ -" + start_old.toString() + "," + cnt[0].toString() + 
         	" +" + start_new.toString() + "," + cnt[1].toString() + " @@\n"+patch;

	addHunkText(patch,reverse);
}
		
/* Compute the selection before actually making it.  Return as object
 * with 2-element array "bounds", and "good", which indicates if the
 * selection contains add/del lines. */
var computeSelection = function(list, from,to)
{
	var startIndex = parseInt(from.getAttribute("index"));
	var endIndex = parseInt(to.getAttribute("index"));
	if (startIndex == -1 || endIndex == -1) 
		return false;

	var up=(startIndex<endIndex)?true:false;
	var nextelem=up?"nextSibling":"previousSibling";

	var insel=from.parentNode && from.parentNode.id=="selected";
	var good=false;
	for(var elem=last=from;;elem=elem[nextelem]) {
		if(!insel && elem.id && elem.id == "selected") {
			// Descend into selection div
			elem=up?elem.childNodes[1]:elem.lastChild;
			insel=true;
		}
		
		var cls=elem.getAttribute("class");
		if(cls) {
			if(cls=="hunkheader") {
				elem=last;
				break; // Stay inside this hunk
			}
			if(!good && (cls=="addline" || cls=="delline"))
				good=true; // A good selection
		}
		if (elem==to) break;
		
		if (insel) {
			if (up?
			    elem==elem.parentNode.lastChild:
			    elem==elem.parentNode.childNodes[1]) {
				// Come up out of selection div
				last=elem;
				insel=false;
				elem=elem.parentNode;
				continue;
			}
		}
		last=elem; 
	}
	to=elem;
	return {bounds:[from,to],good:good};
}
	

var currentSelection = false;

/* Highlight the selection (if it is new) */
var showSelection = function(list, from, to, trust)
{
	if(trust) { // No need to compute bounds.
		var sel={bounds:[from,to],good:true};
	}  else {
		var sel=computeSelection(list,from,to);
        }
	if (!sel) {
		currentSelection=false;
		return;
	}

	if(currentSelection && 
	   currentSelection.bounds[0] == sel.bounds[0] &&
	   currentSelection.bounds[1] == sel.bounds[1] &&
	   currentSelection.good == sel.good) {
		return; // Same selection
	} else {
		currentSelection = sel;
	}

	if(!trust) deselect();

	var beg=parseInt(sel.bounds[0].getAttribute("index"));
	var end=parseInt(sel.bounds[1].getAttribute("index"));

	// new Array().slice() doesn't work with elementnodes :(
	// So we create an array ourselves
	var elementList = [];
	var up=beg<=end?true:false;
	var addelem=up?"push":"unshift";

	for (var i = beg; up?(i <= end):(i >= end); up?++i:--i) {
		elementList[addelem](from.parentNode.childNodes[i]);
	}

	var selection = document.createElement("div");
	selection.setAttribute("id", "selected");

	var button=document.createElement('a');
	button.setAttribute("href","#");
	button.appendChild(document.createTextNode(
				   (originalCached?"Uns":"S")+"tage line"+
				   (elementList.length>1?"s":"")));
	button.setAttribute("class","hunkbutton");
	button.setAttribute("id","stagelines");

	if (sel.good) {
		button.setAttribute('onclick','stageLines('+
				    (originalCached?'true':'false')+
				    '); return false;');
	} else {
		button.setAttribute("class","disabled");
	}
	selection.appendChild(button);
    
	list.insertBefore(selection, from);
	for (i = 0; i < elementList.length; i++)
		selection.appendChild(elementList[i]);
}


