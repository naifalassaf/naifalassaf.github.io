function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }

function checkforties(arr1, arr2, ties){
    for(let i = 0; i < arr1.length; i++){
        for(let j = 0; j < ties.length; j++){
            console.log(arr1[i], arr2[i] + " " + ties[j]);
            if((arr1[i] == ties[j][0] && arr2[i] ==ties[j][1]) || (arr2[i] == ties[j][0] && arr1[i] ==ties[j][1]) || (arr1[i] == arr2[i])){
                console.log("TIE");
                return true;
            }
        }
    }
    return false;
}


//name, connection, connection
//function that takes in an array of names, some elements have connections, and returns two arrays, one with the names and one with the connections
function getConnections(names){
    var connections = [];
    var namesArr = [];
    for(let i = 0; i < names.length; i++){
        var name = names[i].split(",");
        namesArr.push(name[0]);
        if (name[1] != undefined){
            connections.push([name[0], name[1]]);
        }
    }
    console.log(namesArr);
    console.log(connections);
    return [namesArr, connections];
}


//function populates an array with names seperated by new lines, names are inputed from a text box
function populateArray(textbox){
    let names = textbox.value.split("\n");
    let arr = [];
    for(let i = 0; i < names.length; i++){
        arr.push(names[i]);
    }
    return arr;
}
//function that activates when pressing the button
function eidiyah(){
    var flag = true;
    var connections = getConnections(populateArray(document.getElementById("entry")));
    var names = connections[0];
    var connections = connections[1];
    console.log(names);
    var arr = names.slice(0);
    var result = "";
    shuffle(arr);
    while(flag != true){
        if(checkforties(arr, names, connections)){
            shuffle(arr);
        }
        else{
            flag = true;
        }
    }
    for(let i = 0; i < names.length; i++){

    result += names[i] + " gifts to " + arr[i] + "<br>";
    console.log(names[i] + " gifts to " + arr[i]);
    }
    document.getElementById("zone").innerHTML = result;
}

var btn = document.getElementById("mybutton");
btn.addEventListener("click", eidiyah);
