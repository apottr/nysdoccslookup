var cheerio = require('cheerio');
var fs = require('fs');
var request = require('request');

var file_functions = {
	phase1: function(callback){
		fs.readFile('phase1.html',function(err,data){
			callback(cheerio.load(data, {ignoreWhitespace: true}));
		});
	},
	phase2: function(first,last,token,callback){
		fs.readFile('phase2.html',function(err,data){
			callback(cheerio.load(data, {ignoreWhitespace: true}));
		});
	},
	phase3: function(inmate,callback){
		fs.readFile('phase3.html',function(err,data){
			callback(cheerio.load(data, {ignoreWhitespace: true}));
		});
	},
	phase4: function(stay,callback){
		fs.readFile('phase4.html',function(err,data){
			callback(cheerio.load(data, {ignoreWhitespace: true}));
		});
	}
};
var root_url = 'http://nysdoccslookup.doccs.ny.gov';
var request_functions = {
	phase1: function(callback){
		request({url: root_url},function(err,response,body){
			callback(cheerio.load(body,{ignoreWhitespace:true}));
		});
	},
	phase2: function(first,last,token,callback){
		request.post({url: root_url+'/GCA00P00/WIQ1/WINQ000', form: {M00_LAST_NAMEI: last, M00_FIRST_NAMEI: first
																	, DFH_STATE_TOKEN: token, K01: 'WINQ000'}}
																	,function(err,response,body){
			callback(cheerio.load(body,{ignoreWhitespace:true}));
		});
	},
	phase3: function(inmate,callback){
		request.post({url: root_url+'/GCA00P00/WIQ3/WINQ130', form: inmate},function(err,response,body){
			callback(cheerio.load(body,{ignoreWhitespace:true}));
		});
	},
	phase4: function(stay,callback){
		console.log(stay);
		request.post({url: root_url+'/GCA00P00/WIQ2/WINQ120', form: stay},function(err,response,body){
			callback(cheerio.load(body,{ignoreWhitespace:true}));
		});

	}
};

/*var internal_functions = {
	
};*/

var internal_functions = {
	phase1: function($){
		return $('input[name=DFH_STATE_TOKEN]').attr('value');
	},
	phase2: function($){
		var c = [];
		var b = ['M13_SEL_DINI','K01',
			'K02','K03','K04','K05',
			'K06','DFH_STATE_TOKEN','DFH_MAP_TOKEN','din'];
		if($('p[class=err]').text().split(' ')[0] != 'NO'){}
		$('#dinlist').find('td').each(function(i,elem){
			var a = {};
			$(elem).find('input').each(function(j,flem){
				if(b.indexOf($(flem).attr('name')) != -1 || 
				b.indexOf($(flem).attr('name').substr(0,3)) != -1){
					if($(flem).attr('value') != ''){
						a[$(flem).attr('name')] = $(flem).attr('value');
					}
				}
			});
			if(a.hasOwnProperty('DFH_STATE_TOKEN')){
				c.push(a);
				//console.log(a);
			}
		});
		return c;
	},
	phase3: function($){
		var b = [];
		var c = [];
		/*var c = ['M12_SEL_DINI','K01',
			'K02','K03','K04','K05',
			'K06','DFH_STATE_TOKEN','DFH_MAP_TOKEN','din'];*/
		if($('title').text().split(' ')[0] == 'Commitment'){
		var token = $('input[name=DFH_STATE_TOKEN]').attr('value');
		$('#content').find('input[type=submit]').each(function(i,elem){
			if($(elem).attr('value') != ''){
				var d = [$(elem).attr('name'),$(elem).attr('value')];
				if(c.indexOf(d) == -1){
					//console.log(d);
					c.push(d);
				}
			}
		});
		for(var i = 0; i<c.length; i++){
			var a = {};
			a['M12_SEL_DINI'] = c[i][1];
			a[c[i][0]] = c[i][1];
			a['DFH_STATE_TOKEN'] = token;
			a['K01'] = 'WINQ120';
			if(a != {}){
				b.push(a);
			}
		};
		return b;
		}else{
			return [];
		}
	},
		
	phase4: function($){
		var a = {t1a: 'din',
			 t1b: 'name',
			 t1c: 'sex',
			 t1d: 'birth',
			 t1e: 'ethnicity',
			 t1f: 'status',
			 t1g: 'facility',
			 t1i: 'recieved',
			 t1j: 'admission',
			 t1k: 'county',
			 crime: 'crime',
			 class: 'class'};
		var c = {};
		var b = ['t1a','t1b','crime'
			,'class','t1c','t1d'
			,'t1e','t1f','t1g'
			,'t1i','t1j','t1k','t1l'];
		$('td').each(function(i,elem){
			if(b.indexOf($(this).attr('headers')) != -1 && $(this).text() != ' '){
				if($(this).attr('headers') == 't1l'){
					var x = $(this).text().replace(/([0-9\/]*) ([A-Z ]*)/,'$1|$2').split('|');
					c['releaseDate'] = x[0];
					c['releaseType'] = x[1];
				}else{
					c[a[$(this).attr('headers')]] = $(this).text().trim()
				}
			}
		});
		return c;
	}
};

module.exports = function(first,last,callback){
	var inmate_data = [];
	request_functions.phase1(function(data){
		var token = internal_functions.phase1(data);
		console.log(token);
		request_functions.phase2(first,last,token,function(data){
			var inmates = internal_functions.phase2(data);
			//console.log(inmates);
			request_functions.phase3(inmates[0],function(data){
				var incarcerations = internal_functions.phase3(data);
				//console.log(incarcerations);
				if(incarcerations.length != 0){
				for(var i=0; i<incarcerations.length; i++){
					request_functions.phase4(incarcerations[i],function(data){
						//console.log(data);
						var incarceration = internal_functions.phase4(data);
						console.log(incarceration);
						inmate_data.push(incarceration);
						if(inmate_data.length == incarcerations.length){
							callback(inmate_data);
						}
					});
				}
			}else{
				var incarceration = internal_functions.phase4(data);
				var inmate_data = [incarceration];
				callback(inmate_data);
			}
			});
		});
	});
};

/*main('MARQUISE','AKALONU',function(data){
	console.log(data);
});*/


