// a function that returns a random element of the array
function getRandomElement(arr){
    return arr[Math.floor(Math.random() * arr.length)];
}


var arr = ["Call your Mom!",
"Check it out!",
"Holy cow, man!",
"Loved by dozens!",
"Nice to meet you!",
"Gasp!",
"I forgot how cool I am!",
"I made this website!",
"Full of secrets!",
"Don't look too close!",
"Is a human, I swear!",
"Just rolling by!",
"Mom come pick me up I'm scared!",
"I'm a robot!",
"Like black mirror, but good!",
"wake up!",
"I've been here the whole time!",
"It's me!",
"Held together by duct tape and spite!",
"I like trains!"];
var names = getRandomElement(arr);
document.getElementById("subtitle").innerHTML = names;
console.log(names);
