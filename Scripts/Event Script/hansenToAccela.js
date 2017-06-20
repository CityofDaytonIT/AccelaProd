/*===================================================================
// ID: 
// Name: hansenToAccela
// Developer: James Lloyd
// Developer Agency: Woolpert
// Script Description: Creates Accela record from Hansen
// Status: 
===================================================================*/

//****************************************************************
// Custom Web Service settings
//****************************************************************
var UriBase = "http://10.16.81.21:804/HansenAccelaServices/";
var LogTest = "LogTest.svc/LogTest";
var CreateHansenServiceRequest = "HansenServiceRequestCreate.svc/CreateHansenServiceRequest";

var provider = "Han84";
var username = "jlloyd"; //update for DEV and PROD
var password = 'hansen'; //update for DEV and PROD
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
        return null;
    }
};

var ReferenceNumber = capId.getCustomID();

//Address Key
var capAddResult = aa.address.getAddressByCapId(capId);
var AddressKey = "";
var StreetNumber;
var PreDirection;
var StreetName;
var Suffix;
var City;
var State;
var Zip;

if (capAddResult.getSuccess()) {
    var Adds = capAddResult.getOutput();
    for (zz in Adds) {
        refId = Adds[zz].getRefAddressId();
        PreDirection = Adds[zz].getStreetDirection();
        StreetNumber = Adds[zz].getHouseNumberStart();
        StreetName = Adds[zz].getStreetName();
        Suffix = Adds[zz].getStreetSuffix();
        City = Adds[zz].getCity();
        State = Adds[zz].getState();
        Zip = Adds[zz].getZip();
    }
};

if (refId != null) {
	refAddrResult = aa.address.getRefAddressByPK(String(refId));
	if (refAddrResult.getSuccess()) {
		refAddr = refAddrResult.getOutput();
		refAddressModel = refAddr.getRefAddressModel();
		var tmpAttrs = refAddressModel.getAttributes();
		if(tmpAttrs != null){
			var tmpAttrsArr = tmpAttrs.toArray();
			for( var tIndex in tmpAttrsArr) {
				thisAttribute = tmpAttrsArr[tIndex];
				if (thisAttribute.getAttributeName().toUpperCase() == "ADDRKEY")
					AddressKey = "" + thisAttribute.getAttributeValue();
			}
		}

	}
}
	

//var fcapAddressObj;
//var capAddressResult = aa.address.getAddressWithAttributeByCapId(capId);
//if (capAddressResult.getSuccess()) {
//    fcapAddressObj = capAddressResult.getOutput();
//}

//for (i in fcapAddressObj) {
//    var addressAttrObj = fcapAddressObj[i].getAttributes().toArray();
//    for (z in addressAttrObj) {
//        if (addressAttrObj[z].getB1AttributeName() == "ADDRKEY") {
//            AddressKey = addressAttrObj[z].getB1AttributeValue();
//        };
//    };
//};


//Complaint 3 - Request Type
var RequestType;
var itemName = "Complaint 1";

var appSpecInfoResult = aa.appSpecificInfo.getByCapID(capId);
var appspecObj = appSpecInfoResult.getOutput();

for (i in appspecObj)
    if (appspecObj[i].getCheckboxDesc() == itemName) {
        RequestType = appspecObj[i].getChecklistComment();
    }

//Get Inspector value from Case
var Inspector = ""; // = "WAR07";
var inspections = aa.inspection.getInspections(capId);
var inspectionList = inspections.getOutput();

for (inspection in inspectionList) {
    aa.print("inspections[i]: " + inspectionList[inspection].getInspector());
    var userModel = inspectionList[inspection].getInspector();
    var userId = userModel.getUserID();

    var strControl;
    var bizDomain = "ACCELA_USERNAME_TO_EMPID";
    var bizDomainValue = userId;
    var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(bizDomain, userId);

    if (bizDomScriptResult.getSuccess()) {
        var bizDomScriptObj = bizDomScriptResult.getOutput();
        strControl = "" + bizDomScriptObj.getDescription(); // had to do this or it bombs.  who knows why?
        Inspector = strControl;
    }
}

//Get Added By
var currentUserID = aa.env.getValue("CurrentUserID");
var AddedBy = "";
var bizDomain = "ACCELA_USERNAME_TO_EMPID";
var bizDomainValue = currentUserID;
var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(bizDomain, currentUserID);
aa.print("bizDomScriptResult.getSuccess(): " + bizDomScriptResult.getSuccess())
if (bizDomScriptResult.getSuccess()) {
    var bizDomScriptObj = bizDomScriptResult.getOutput();
    AddedBy = "" + bizDomScriptObj.getDescription(); // had to do this or it bombs.  who knows why?
    aa.print("AddedBy: " + AddedBy);
}

// Get Priority
var cdScriptObjResult = aa.cap.getCapDetail(capId);
var cdScriptObj = cdScriptObjResult.getOutput();
var cd = cdScriptObj.getCapDetailModel();
var Priority = cd.getPriority();

// Get the Request Date
var inspections = aa.inspection.getInspections(capId);
var inspectionList = inspections.getOutput();
var RequestDate;
for (inspection in inspectionList) {
    var scriptDateTime = inspectionList[inspection].getRequestDate();
    var RequestDate = scriptDateTime.getMonth() + "/" + scriptDateTime.getDayOfMonth() + "/" + scriptDateTime.getYear();
//    var requestDate = new Date(String(requestDateString));
}

// Get Case Status
//var Resolution = aa.cap.getCapStatus();


if (AddressKey === null) { AddressKey = 0; }
var jsonOut = '{ "ReferenceNumber" : "' + ReferenceNumber +
                    '", "AddressKey" : "' + AddressKey +
                    '", "PreDirection" : "' + PreDirection +
                    '", "StreetNumber" : "' + StreetNumber +
                    '", "StreetName" : "' + StreetName +
                    '", "Suffix" : "' + Suffix +
                    '", "City" : "' + City +
                    '", "State" : "' + State +
                    '", "Zip" : "' + Zip +
                    '", "RequestType" : "' + RequestType +
                    '", "Inspector" : "' + Inspector +
                    '", "Priority" : "' + Priority +
                    '", "InitiatedDateTime" : "' + RequestDate +
                    '", "Resolution" : "' + capStatus +
                    '", "AddedBy" : "' + AddedBy + '"}';

aa.print(jsonOut);
var hansenSRNo = postToHansen(CreateHansenServiceRequest, jsonOut);
//var hansenSRNo = postToHansen(LogTest, jsonOut);

//Set Hansen SR#
var hansenSRField = "Hansen SR#";
var appSpecInfoUpdateResultHansenSRNo = aa.appSpecificInfo.editSingleAppSpecific(capId, hansenSRField, hansenSRNo, null);

