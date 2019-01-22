////****************************************************************
////  Script added to Accela and configured as separate Batch Jobs 
////  that run on an as-needed basis
////
////    Purpose: Calls a custom WCF web service (written by Woolpert) that
////            queries Accela for Housing-related cases where Hansen
////            Service Requests were not successfully created.  Creates a 
////            corresponding Hansen Service Request. Updates the Accela
////            with the Hansen Service Request Number
////
////    Created: November 2016
////    Created By: James Lloyd - Woolpert, Inc. james.lloyd@woolpert.com
////
////****************************************************************

//****************************************************************
//Custom Web Service settings
//****************************************************************
var UriBase = "http://10.16.81.43:804/HansenAccelaServices/";
var AddHansenSRs = "AccelaCasesNotInHansen.svc/AddHansenSRs";

var provider = "imsp";
var username = "accela";
var password = 'accela';
var contentType = "application/json";

//****************************************************************
// Makes a call to the custom WCF Web Service
//****************************************************************
function postToHansen(service, body) {

    var post = new org.apache.commons.httpclient.methods.PostMethod(UriBase + service);
    var client = new org.apache.commons.httpclient.HttpClient();

    // ---- Authentication ---- //
    if (username !== null && password !== null) {
        var creds = new org.apache.commons.httpclient.UsernamePasswordCredentials(username, password);
        client.getParams().setAuthenticationPreemptive(true);
        client.getState().setCredentials(org.apache.commons.httpclient.auth.AuthScope.ANY, creds);
    }
    // -------------------------- //

    post.setRequestHeader("Content-type", contentType);
    post.setRequestEntity(new org.apache.commons.httpclient.methods.StringRequestEntity(body, contentType, "UTF-8"));
    var status = client.executeMethod(post);
    aa.print("web service call status: " + status);

    var br = new java.io.BufferedReader(new java.io.InputStreamReader(post.getResponseBodyAsStream()));
    var response = "";
    var line = br.readLine();
    while (line != null) {
        response = response + line;
        line = br.readLine();
    }
    post.releaseConnection();

    return response;
};

//****************************************************************
//BEGIN ACTUAL PROCESSING...
//****************************************************************

// Call to Hansen
var postResponse = postToHansen(AddHansenSRs, "");
aa.print(postResponse);
