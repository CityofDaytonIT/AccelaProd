//Application Status Update After

/*===================================================================*/

//Developer: James Lloyd
//Developer Agency: Woolpert
//Script Description: Passes new Status and Status comments to Hansen via custom web api
// Revision Date: 2017/03/23
//

//Global settings...
var showMessage = false;                        // Set to true to see results in popup window
var showDebug = false;                            // Set to true to see debug messages in popup window
var message = "";                            // Message String
var debug = "";                                // Debug String
var br = "<BR>";                            // Break Tag 

//****************************************************************
//Custom Web Service settings
//****************************************************************
var UriBase = "http://10.16.81.21:804/HansenAccelaServices/";
var LogTest = "LogTest.svc/LogTest";
var UpdateStatusHansenServiceRequest = "HansenUpdateStatus.svc/UpdateStatusHansenServiceRequest";

var provider = "Han84";
var username = "accela";
var password = 'accela';
var contentType = "application/json";
function postToHansen(service, body) {
    try {
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
        aa.print("<br/>status: " + status);

        var br = new java.io.BufferedReader(new java.io.InputStreamReader(post.getResponseBodyAsStream()));
        var response = "";
        var line = br.readLine();
        while (line != null) {
            response = response + line;
            line = br.readLine();
        }
        post.releaseConnection();

        return response;
    }
    catch (err) {
        logDebug("ERROR Posting to Hansen: " + err)
        return null;
    }
};

//Get Hansen SR#
var ReferenceNumber;
var appSpecInfoResult = aa.appSpecificInfo.getByCapID(capId);
var appspecObj = appSpecInfoResult.getOutput();
var itemName = "Hansen SR#";
for (i in appspecObj) {
    if (appspecObj[i].getCheckboxDesc() == itemName) {
        ReferenceNumber = appspecObj[i].getChecklistComment();
        break;
    }
}
var statusComments = getMostRecentAppComment();
var inspComments = getMostRecentInspectionResultComment();
sendComment = statusComments + inspComments;

var jsonOut = '{ "ReferenceNumber" : "' + ReferenceNumber +
                    '", "RequestComments" : "' + sendComment +
                    '", "Resolution" : "' + capStatus + '"}';



postToHansen(UpdateStatusHansenServiceRequest, jsonOut);


function getMostRecentAppComment() { // optional statusees to exclude

    statusResult = aa.cap.getStatusHistoryByCap(capId, "APPLICATION", null);
    if (statusResult.getSuccess()) {
        statusArr = statusResult.getOutput();
        if (statusArr && statusArr.length > 0) {
            for (xx in statusArr) {
                var thisStatus = statusArr[xx];
                if (thisStatus.getStatusComment() != null) { return thisStatus.getStatusComment(); }
            }
        }
    }
    else {
        aa.print("Error getting application status history " + statusResult.getErrorMessage());
    }
return "";
}

function getMostRecentInspectionResultComment() {
	itemCapId = capId;
	if (arguments.length > 0) itemCapId = arguments[0];
	var inspResult = aa.inspection.getInspections(itemCapId);
	if (inspResult.getSuccess()) {
		inspList = inspResult.getOutput();
		if (inspList != null) {
			inspDate = inspList[0].getInspectionDate();
			inspList.sort(compareInspCompletedDate);
			mostRecentInsp = inspList[0];
			inspModel = mostRecentInsp.getInspection();
			comment = inspModel.getResultComment();
			return comment;
		}
	}
	return "";
}

function compareInspCompletedDate(a, b) {
		if (a.getInspectionDate() == null && b.getInspectionDate() == null) {
			return -1;
		}
		if (a.getInspectionDate() == null && b.getInspectionDate() != null) {
			return 1;
		}
		if (a.getInspectionDate() != null && b.getInspectionDate() == null) {
			return -1;
		}
		return (b.getInspectionDate().getEpochMilliseconds() - a.getInspectionDate().getEpochMilliseconds());
}

