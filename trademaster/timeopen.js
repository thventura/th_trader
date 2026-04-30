// Counter Asset open time (in develop)

class Timeopen {



	constructor(widget, obj) {

	}

	setList(list) {
		var obj;


		/*
	  //  opening and closing of an asset for the current day
	  var arr =  list.split(';');
	  var d = new Date();
	  var n = d.getDay()-1;	
	  var times = arr[n];
	  var arr2 = times .split('-');
		
	  var timeopen =  arr2[0];
	  var timeclose =  arr2[1];
		*/




		//var date = new Date( close  * 1000);


		// console.log(timeopen.toString());	

	}



	convertLocalTime(time) {
		var t = Date(time);




		var offset = new Date(time).getTimezoneOffset();

	}



	timeNow(time) {
		if (time) {
			return new Date(time).getTime() ;
		} else {
			return Date.now();
		}

	}


}