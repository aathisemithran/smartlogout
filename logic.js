/*
Keys for storage:-
user_cookie = users cookie
is_cookie_in_db = true if cookie is present in DB.
encrypted_count = count of how many times encrypted cookie.

*/
sl = {
	session_data : {
		"login_attempt" : 0,
		"cookies" : null,
		"encrypted_count": 0
	},
	util : {
		showPopup : function(text, callback){
			sl.util.hidePopup(true, function(){
				jQuery("#popup_message").html(text);
				jQuery("#popup_message").show();
				jQuery("#popup_message").animate(
					{ top:'0%'},
					400,
					callback
				);
			});
		},
		hidePopup : function(is_fast, callback){
			jQuery("#popup_message").animate({
				top:'-9%'
			},
			((is_fast!=undefined && is_fast==true) ? 0 : 200),
			function x(){
				jQuery("#popup_message").animate({
					top:'-18%'
				},
				((is_fast!=undefined && is_fast==true) ? 0 : 100),
				function(){
					jQuery("#popup_message").hide();
					if(callback!=undefined || callback!=null){
						callback();
					}
				});
			});
		},
		getAllCookiesFromBrowser : function(callback_func){
			chrome.cookies.getAll({}, callback_func);

		},
		getEncryptedData : function(key, data){
			key = key.toString();
			/* encrypt given data with the key and return*/
			data = JSON.stringify(data);
			  var bit_data = "";
			  var ref = "00000000";
			  data += "abcdefghijklmnopqrstuvwxyz";
			for(var i = 0; i < data.length; i++) {
				var temp = data[i].charCodeAt(0).toString(2);
			      temp = ref.slice(temp.length)+temp;
			      bit_data+=temp;
			}
			  var bit_array = bit_data.match(/.{1,4}/g);
			  key_array = [];
			  for(var i=0; i<key.length; i++){
			    key_array.push(key[i].charCodeAt(0));
			  }
			  for(var i=0; i<bit_array.length; i++){
			    var temp = bit_array[i];
			    var t = (i+ key_array[ (i%key_array.length > key_array.length%i ? key_array.length%i : i%key_array.length)]);
			    bit_array[i] = bit_array[(t%bit_array.length > bit_array.length%t ? bit_array.length%t : t%bit_array.length)];
			    bit_array[(t%bit_array.length > bit_array.length%t ? bit_array.length%t : t%bit_array.length)] = temp;
			  }
			  var final_encrypted = "";

			  for(var i=0; (i+1)<bit_array.length; i+=2){
				final_encrypted += (bit_array[i]+bit_array[i+1]);
			  }

/////////////////
			console.log("data coming out of encryption");
			  return final_encrypted;
		},
		setData : function(key_data, callback){
			/* stores data with the given storage_key - clears any storage already there for that key. */
			var db = openDatabase('sl', '1.0', 'Smart logout DB', 2 * 1024 * 1024);
			db.transaction(function (tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS SMARTLOGOUTDETAILS (id unique, detail)');
				for(var key in key_data){
					tx.executeSql('DELETE FROM SMARTLOGOUTDETAILS WHERE id = "'+ key +'"', null, function(){});
					tx.executeSql('INSERT INTO SMARTLOGOUTDETAILS (id,detail) VALUES (?, ?)', [key, key_data[key]]);
				}
				if(callback != undefined){
					callback();
				}
			});
		},
		deleteAllCookiesFromBrowser : function(cookies){
			for(var i=0; i<cookies.length; i++){
				var each_cookie = cookies[i];
				var url = 'http';
				url += each_cookie.secure ? 's://' : '://';
				url += each_cookie.domain.charAt(0) == '.' ? 'www' : '';
				url += each_cookie.domain;
				url += each_cookie.path;
				var name = each_cookie.name;
				chrome.cookies.remove({"url":url, "name":name}, function(){});
			}
			
		},
		getData : function(key, success_callback, fail_callback){
			var data_for_callback = {};
			var key_arr = [];
			if(typeof key != 'object'){
				key_arr.push(key);
			}
			else{
				key_arr = key;
			}
			var db = openDatabase('sl', '1.0', 'Smart logout DB', 2 * 1024 * 1024);
			console.log(db);
			db.transaction(function (tx) {
	            	tx.executeSql('SELECT * FROM SMARTLOGOUTDETAILS', [], function (tx, results) {
					var rows = results.rows;
					for(var i=0; i<rows.length; i++){
						var key1 = rows[i]["id"];
						var value1 = rows[i]["detail"];
						if(key_arr.indexOf(key1) != -1 ){
							data_for_callback[key1] = value1;
						}
					}
					success_callback(data_for_callback);
		           },
				function(){
					fail_callback();
				});
     	     });
		},
		getDecryptedData : function(key, en_data){
			key = key.toString();
			/* get decrypted data for the key. Return null if key is invalid */
			  var alphabets = "abcdefghijklmnopqrstuvwxyz";
			  var en_bit_data = "";
			  var ref = "00000000";
			en_bit_data = en_data;

			  var en_bit_array = en_bit_data.match(/.{1,4}/g);
			  var key_array = [];
			  for (var i=0; i<key.length; i++){
			    key_array.push(key[i].charCodeAt(0));
			  }
			  for(var i=en_bit_array.length-1; i>=0; i--){
			    var temp = en_bit_array[i];
			    var t = (i+ key_array[ (i%key_array.length > key_array.length%i ? key_array.length%i : i%key_array.length)]);
			    en_bit_array[i] = en_bit_array[(t%en_bit_array.length > en_bit_array.length%t ? en_bit_array.length%t : t%en_bit_array.length)];
			    en_bit_array[(t%en_bit_array.length > en_bit_array.length%t ? en_bit_array.length%t : t%en_bit_array.length)] = temp;
			  }
			  var final_decrypted = "";
			  for(var i=0; (i+1)<en_bit_array.length; i+=2){
			    final_decrypted += String.fromCharCode(parseInt("" + en_bit_array[i] + en_bit_array[i+1],2));
			  }
			  if(final_decrypted.indexOf(alphabets)!=-1 && final_decrypted.lastIndexOf(alphabets) === final_decrypted.length-26){
			    return final_decrypted.substring(0, final_decrypted.lastIndexOf(alphabets));
			  }
			  else{
			    return null;
			  }
		},
		setCookiesToBrowser : function(cookies){
			cookies = JSON.parse(cookies);
			for(var i=0; i< cookies.length; i++){
				var to_set = {};
				var each_cookie = cookies[i];
				console.log(each_cookie)
				var url = 'http';
				url += each_cookie.secure ? 's://' : '://';
				url += each_cookie.domain.charAt(0) == '.' ? 'www' : '';
				url += each_cookie.domain;
				url += each_cookie.path;
				to_set.url = url;
				to_set.domain = each_cookie.domain;
				to_set.expirationDate = each_cookie.expirationDate;
				to_set.httpOnly = each_cookie.httpOnly;
				to_set.name = each_cookie.name;
				to_set.path = each_cookie.path;
				to_set.secure = each_cookie.secure;
				to_set.storeId = each_cookie.storeId;
				to_set.value = each_cookie.value;
				chrome.cookies.set(to_set);
			}
		},
		switchPage : function(from, to){
			if(from == null){
				if(to == "doencryption"){
					jQuery("#page_doencryption").show();
				}
				else if(to == "dodecryption"){
					jQuery("#page_dodecryption").show();
				}
			}
			else if(from == "doencryption" && to == "encryption_success"){
				jQuery("#page_doencryption").hide();
				jQuery("#page_encryption_success").show();
			}
			else if(from == "dodecryption" && to == "page_delete_storage_success"){
				jQuery("#page_dodecryption").hide();
				jQuery("#page_delete_storage_success").show();
			}
			else if(from == "confirm_delete_cookie" && to == "delete_cookie_success"){

			}
			else if(from == "dodecryption" && to == "decryption_success"){
				jQuery("#page_dodecryption").hide();
				jQuery("#page_decryption_success").show();
				sl.util.hidePopup(true);
			}
			else if(from == "doencryption"  && to == "just_logout_success"){
				jQuery("#page_doencryption").hide();
				jQuery("#page_just_logout_success").show();
			}
		},
		clearStorage : function(){
			var callback = function(){
				sl.util.switchPage("dodecryption", "page_delete_storage_success")
			}
			sl.util.setData({"user_cookie":null, "is_cookie_in_db":"false"}, callback);
		}
	},
	action : {
		onload : function(){
//			document.getElementById("doencryption_key").focus();
			var success_callback = function(data){
				var user_cookie = data.user_cookie;
				var is_cookie_in_db = data.is_cookie_in_db;
				var encrypted_count = data.encrypted_count;
				sl.session_data.user_cookie = (user_cookie == undefined ? null : user_cookie);
				sl.session_data.is_cookie_in_db = (is_cookie_in_db == undefined || "false" ? false : true);
				sl.session_data.encrypted_count = (encrypted_count==undefined ? 0 : encrypted_count);
				if(is_cookie_in_db == undefined || is_cookie_in_db == "false"){
					sl.util.switchPage(null, "doencryption");
				}
				else if(is_cookie_in_db === "true"){
					sl.util.switchPage(null, "dodecryption");
				}
			};
			var fail_callback = function(){
				sl.util.switchPage(null, "doencryption");
			};
			sl.util.getData(["user_cookie", "is_cookie_in_db", "encrypted_count"], success_callback, fail_callback);
		},
		encryptAndLogout : function(){
			var key = jQuery("#doencryption_key").val();
			if(key === ""){
				sl.util.showPopup("Password is empty.<br>Enter password to encrypt cookies.");
			}
			else{
				var callback = function(){
					var callback1 = function(cookies){
						var callback2 = function(){
							sl.util.hidePopup(true);
							sl.util.switchPage("doencryption", "encryption_success");
						}
						sl.session_data.cookies = cookies;
						sl.util.deleteAllCookiesFromBrowser(cookies);
						var encrypted_data = sl.util.getEncryptedData(key, cookies);
						sl.util.setData({
							"user_cookie" : encrypted_data,
							"is_cookie_in_db": "true",
							"encrypted_count": ++sl.session_data.encrypted_count
						}, callback2);
					};
					sl.util.getAllCookiesFromBrowser(callback1);
				}
				sl.util.showPopup("Loading...", callback);
			}
		},
		decryptAndLogin : function(){
			var key = jQuery("#dodecryption_key").val();
			if(key === ""){
				sl.util.showPopup("Password is empty.<br>Enter the password you used to save Login details.");
			}
			else{	
				var callback = function(){
					sl.session_data.login_attempt++;
					var data_to_decrypt = sl.session_data.user_cookie;
					var data_after_decryption = sl.util.getDecryptedData(key, data_to_decrypt);
					if(data_after_decryption == null){
						jQuery("#dodecryption_key").val("");
						if(sl.session_data.login_attempt > 2){
							sl.util.showPopup("Incorrect Password again.<br><a href='dd'>Forgot Password?</a>");
						}
						else{
							sl.util.showPopup("Incorrect Password.<br>Enter the password you used to save Login details.");
						}
					}
					else{
						sl.util.setCookiesToBrowser(data_after_decryption);
						sl.util.setData({
							"user_cookie":null, 
							"is_cookie_in_db": false, 
							"encrypted_count": (++sl.session_data.encrypted_count)
						});
						sl.util.switchPage("dodecryption", "decryption_success");
					}
				}
				sl.util.showPopup("Loading...", callback);
			}
		
		},
		logout : function(){
			sl.util.deleteAllCookiesFromBrowser();
		},
		restoreMyData : function(key){
			if(sl.util.isKeyValid(key)){
				var encrypted_stored_cookie = sl.util.getData("user_cookie");
				var stored_cookie = sl.util.getDecryptedData(key, encrypted_stored_cookie);
				if(stored_cookie === null){
					//TODO: send INCORRECT key message here..
				}				
				sl.util.setCookiesToBrowser(stored_cookie);
				sl.util.setData({"user_cookie": null});
			}
			else{
				return "INVALID_KEY";
			}
		},
		deleteStoredData : function(){
			sl.util.deleteAllCookiesFromBrowser();
		},
		updateUserAccessCount : function(){
			//TODO:At last.
		},
		showDeleteConfirmation : function(){
				//jQuery(".help").fadeTo("fast",0.15);
				//jQuery(".page_dodecryption .or_just").fadeTo("fast",0.15);
				//jQuery(".get_key_and_retore_login").fadeTo("fast",0.15);
			jQuery("#before_confirmation").animate({left:'-100%'},100, function x(){
				jQuery("#before_confirmation").hide();
				jQuery("#confirmation").show();
				jQuery("#confirmation").animate({left:'0%'},200);
			});
		},
		showLogoutConfirmation : function(){
			jQuery("#logout_button").animate({left:'-100%'},100, function x(){
				jQuery("#logout_button").hide();
				jQuery("#logout_confirmation").show();
				jQuery("#logout_confirmation").animate({left:'0%'},200);
			});		
		},
		hideDeleteConfirmation : function(){
			jQuery("#confirmation").animate({left:'100%'},100,function x(){
				jQuery("#before_confirmation").show();
				jQuery("#confirmation").hide();
				jQuery("#before_confirmation").animate({left:'0%'},200);
				//jQuery(".help").fadeTo("fast",1);
				//jQuery(".page_dodecryption .or_just").fadeTo("fast",1);
				//jQuery(".get_key_and_retore_login").fadeTo("fast",1);
			});
		},
		hideLogoutDeleteConfirmation : function(){
			jQuery("#logout_confirmation").animate({left:'100%'},100,function x(){
				jQuery("#logout_button").show();
				jQuery("#logout_confirmation").hide();
				jQuery("#logout_button").animate({left:'0%'},200);
				//jQuery(".help").fadeTo("fast",1);
				//jQuery(".page_dodecryption .or_just").fadeTo("fast",1);
				//jQuery(".get_key_and_retore_login").fadeTo("fast",1);
			});
		},
		clearStorage : function(){
			sl.util.hidePopup();
			sl.util.clearStorage();
			sl.util.switchPage("confirm_delete_cookie", "delete_cookie_success");
		},
		logoutAllSites : function(){
			var callback = function(cookies){
				sl.util.deleteAllCookiesFromBrowser(cookies);
			};
			sl.util.getAllCookiesFromBrowser(callback);
			sl.util.switchPage("doencryption", "just_logout_success");
		},
		toggleEye : function(){
			if(jQuery(".password_input").attr("type") == "password"){
				jQuery(".eye_icon_visible").fadeTo(1, "1");
				jQuery(".eye_icon_hidden").fadeTo(1, "0");
				jQuery(".password_input").attr("type","text");
			}
			else{
				jQuery(".eye_icon_visible").fadeTo(1, "0");
				jQuery(".eye_icon_hidden").fadeTo(1, "1");
				jQuery(".password_input").attr("type","password");
			}
		}
	}
};
window.onload = function(){
	sl.action.onload();
	jQuery("#doencryption_ok").click(function(){sl.action.encryptAndLogout()});
	document.getElementById("clear_login").onclick = function(){sl.action.showDeleteConfirmation();}
	jQuery("#confirmation #no").click(function(){ sl.action.hideDeleteConfirmation(); });
	jQuery("#confirmation #yes").click(function(){ sl.action.clearStorage(); });
	jQuery("#dodecryption_ok").click(function(){sl.action.decryptAndLogin();});
	jQuery("#logout_all").click(function(){sl.action.showLogoutConfirmation();});
	jQuery("#logout_confirmation #logout_yes").click(function(){ sl.action.logoutAllSites(); });
	jQuery("#logout_confirmation #logout_no").click(function(){ sl.action.hideLogoutDeleteConfirmation(); });

	jQuery(".eye_icon_visible").click(function(){sl.action.toggleEye();});
	jQuery(".eye_icon_hidden").click(function(){sl.action.toggleEye();});
	jQuery("#help_content").click(function(){chrome.tabs.create({ url: "help_doc.html" });});
};

