$(function() {    
    var bucketName = 'customer-references-2';
    var bucketRegion = 'us-west-2';
    var IdentityPoolId = 'us-west-2:817299d3-4a21-4dad-99a3-fc70742e1f15';    
    var fileTypes = ['image/jpeg', 'image/pjpeg', 'image/png'];
    var imageList = new Array();
    var errorList = new Array();
    var fileListCount = 0;

    // BEGIN S3 UPLOAD SECTION
    // Set the region where your identity pool exists (us-east-1, eu-west-1)
    AWS.config.region = bucketRegion;

    // Configure the credentials provider to use your identity pool
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId, // This trailing comma was in the AWS instructions. Leaving it, even though it may not be necessary.
    });

    // Make the call to obtain credentials
    AWS.config.credentials.get(function(){
        // Credentials will be available when this function is called.
        accessKeyId = AWS.config.credentials.accessKeyId;
        secretAccessKey = AWS.config.credentials.secretAccessKey;
        sessionToken = AWS.config.credentials.sessionToken;
    });

    var s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      params: {Bucket: bucketName}
    });

    function addPhoto(file, fileNum) {
      var fileName = Date.now().toString() + '_' + file.name;
      s3.upload({
        Key: fileName,
        Body: file,
        ACL: 'public-read',
        ContentType: file.type
      }, function(err, data) {
        if (err) {
          errorList.push('Error uploading file \'' + fileName + '\': ' + err.message);
          return;
        }
        imageList.push('Image #' + fileNum + ': ' + data.Location);
      });
    }
    // END S3 UPLOAD SECTION
    
    var gotcha = $('#gotcha').val();

    function validEmail(email) {
      var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
      return re.test(email);
    }

    $('#email').change(function() {
      if ($(this).val() && !validEmail($(this).val())){
        $('.submit').prop('disabled', true);
        $('.notifications').empty();
        $('.notifications').append('<p class="required_notification">We\'re sorry. This appears to be an invalid email address.</p>');
        $(this).focus();
      } else if ($(this).val()) {
        $('.notifications').empty();
        $('.submit').prop('disabled', false);
      }
    });

    function validFileType(file) {
      for (var i = 0; i < fileTypes.length; i++) {
        if (file.type === fileTypes[i]) {
          return true;
        }
      }
      return false;
    }

    function returnFileSize(number) {
      if (number < 1024) {
        return number + 'bytes';
      } else if (number > 1024 && number < 1048576) {
        return (number/1024).toFixed(1) + 'KB';
      } else if (number > 1048576) {
        return (number/1048576).toFixed(1) + 'MB';
      }
    }    
    
    // get all data in form and return object
    function getFormData() {
      var form = document.getElementById("gform");
      var elements = form.elements; // all form elements
      // un-uncomment below when needed for debugging
      // console.log(elements);
      var fields = Object.keys(elements).map(function(k) {
        if (elements[k].name !== undefined && elements[k].name !== 'gotcha' && elements[k].name !== 'image-uploader') {
          return elements[k].name;
        // special case for Edge's html collection
        } else if (elements[k].length > 0) {
          return elements[k].item(0).name;
        }
      }).filter(function(item, pos, self) {
        return self.indexOf(item) == pos && item;
      });
      var data = {};
      fields.forEach(function(k) {
        data[k] = elements[k].value;
        var str = ""; // declare empty string outside of loop to allow
                      // it to be appended to for each item in the loop
        if (elements[k].type === "checkbox") { // special case for Edge's html collection
          str = str + elements[k].checked + ", "; // take the string and append 
                                                  // the current checked value to 
                                                  // the end of it, along with 
                                                  // a comma and a space
          data[k] = str.slice(0, -2); // remove the last comma and space 
                                      // from the  string to make the output 
                                      // prettier in the spreadsheet
        } else if (elements[k].length) {
          for (var i = 0; i < elements[k].length; i++) {
            if (elements[k].item(i).checked) {
              str = str + elements[k].item(i).value + ", "; // same as above
              data[k] = str.slice(0, -2);
            }
          }
        }
      });

      // add form-specific values into the data
      data.formDataNameOrder = JSON.stringify(fields);
      data.formGoogleSheetName = form.dataset.sheet || "responses"; // default sheet name
      data.formGoogleSendEmail = form.dataset.email || ""; // no email by default
      
      // un-uncomment below when needed for debugging
      // console.log(data);
      return data;
    }

    function sendEmail() {
      if (gotcha == '') {        
        // un-uncomment below when needed for debugging
        // console.log('Welcome, human!');
        var data = getFormData();        
        // un-uncomment below when needed for debugging
        // console.log(data);
        var url = 'https://script.google.com/a/photovisionprints.com/macros/s/AKfycbyS3jf9yXCXR9TXNrpdlaz1kqONyYPXEhgYN4UTDR0Yn1cLRpT9/exec';
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        // xhr.withCredentials = true;
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function() {
          // un-uncomment below when needed for debugging
          // console.log( xhr.status, xhr.statusText );
          // console.log(xhr.responseText);
          $('html,body').css('cursor','default');
          window.location.replace("/preferences-thanks");
          return;
        };
        // url encode form data for sending as post data
        var encoded = Object.keys(data).map(function(k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
        }).join('&');
        xhr.send(encoded);
      } else {
        $('html,body').css('cursor','default');
        // un-uncomment below when needed for debugging
        // console.log('Robot detected!');
        return false;
      }
    }
    
    function checkIfUploadsDone() {
        if (imageList.length + errorList.length != fileListCount) {
            window.setTimeout(checkIfUploadsDone, 250); // this checks if upload attempts are done every 250 milliseconds
        } else {
            if (errorList.length === 0) {
                $('#images').val(imageList.sort().join('; <br />'));
                sendEmail();
                $('html,body').css('cursor','default');
                return;
            } else {
                $('.uploading').remove();
                $('.notifications').append('<p class="required_notification">Oops, there was an error uploading one or more files. Here are the errors: <br /><br />'
                 + errorList.sort().join('<br />') 
                 + '<br /></br /> Please retry, or call us for support.' + '</p>');
                $('html,body').css('cursor','default');
                return;
            }
        }
    }

    $('.submit').click(function(e) {
      e.preventDefault();
      $('html,body').css('cursor','wait');
      var files = $('#image-uploader')[0].files;
      fileListCount = files.length;

      if (fileListCount > 0) {          
        $('.notifications').append('<p class="required_notification uploading">Hang on...Uploading image(s) first… Please don\'t refresh or leave this page.</p>');
        for (var i = 0; i < fileListCount; i++) {
          addPhoto(files[i], i + 1);
        }
      }
      
      checkIfUploadsDone(files);      
    });

    $('#image-uploader').change(function() {
      $('.image-preview').empty();
      var files = this.files;

      if (files.length === 0) {
        $('.image-preview').append('<p class="required_notification">No files currently selected for upload</p>');
      } else if (files.length > 5) {
        $('.image-preview').append('<p class="required_notification">Please limit your selection to 5 (five) images or less</p>');
      } else {
        var list = document.createElement('ul');
        $('.image-preview').append(list);
        for (var i = 0; i < files.length; i++) {
          var listItem = document.createElement('li');
          var para = document.createElement('p');
          para.setAttribute("class", "required_notification");
          if (validFileType(files[i])) {
            if (files[i].size > 2621440) {
              para.textContent = files[i].name + ' is too large. Please restrict your selection to files under 2.5MB.';
              $('.image-preview').append(para);
            } else {
              var img = document.createElement('img');
              img.src = window.URL.createObjectURL(files[i]);
              img.width = 130;
              img.onload = function() {
                window.URL.revokeObjectURL(this.src);
              }
              img.setAttribute("title", files[i].name + " -- " + returnFileSize(files[i].size));

              listItem.appendChild(img);
            }
          } else {
            para.textContent = '"' + files[i].name + '" is not a valid JPEG or PNG image. Please update your selection.';
            $('.image-preview').append(para);
          }
          list.appendChild(listItem);
        }
      }
    });
  });
