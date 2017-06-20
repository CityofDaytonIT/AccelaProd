////****************************************************************
////  Script added to Accela and configured as separate Batch Jobs 
////  that run every 15 minutes throughout the day.
////
////    Purpose: Calls a custom WCF web service (written by Woolpert) that
////            queries Hansen (via the Hansen API) for Housing-related
////            Service Requests.  Creates a corresponding Accela Case.
////            For each Accela Case created, script updates the Hansen
////            SR with the Accela Case Number.
////
////    Created: November 2016
////    Created By: James Lloyd - Woolpert, Inc. james.lloyd@woolpert.com
////
////****************************************************************

useAppSpecificGroupName = false;
AInfo = new Array();
function getScriptText(vScriptName) {
    vScriptName = vScriptName.toUpperCase();
    var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
    var emseScript = emseBiz.getMasterScript(aa.getServiceProviderCode(), vScriptName);
    return emseScript.getScriptText() + "";
}
////****************************************************************
////  Accela Script include
////****************************************************************
eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS"));

//Global settings...
var showMessage = true;                        // Set to true to see results in popup window
var showDebug = 3;                            // Set to true to see debug messages in popup window
var message = "";                            // Message String
var debug = "";                                // Debug String
var br = "<BR>";                            // Break Tag 

//****************************************************************
//Custom Web Service settings
//****************************************************************
var UriBase = "http://10.16.81.21:804/HansenAccelaServices/";
var GetHansenServiceReq = "HansenServiceRequests.svc/GetHansenServiceReq";
var SetAccelaRecordId = "HansenSetAccelaRecordId.svc/SetAccelaRecordId";
var GetAccelaCapIds = "AccelaCasesNotInHansen.svc/GetAccelaCapIds";

var provider = "Han84";
var username = "accela";
var password = 'accela';
var contentType = "application/json";

//****************************************************************
//Vars for the creating Accela Case from Hansen Service Requests
//****************************************************************
var iGroup = "H_CASE_INVST";
var iType = "Complaint";
var capParts = "";
var capPart1 = "";
var capPart2 = "";
var capPart3 = "";
var itemGroup = null;
var complaint1 = "Complaint 1";
var hansenSRNo = "Hansen SR#";
var inspectorObj = null;

//****************************************************************
// Codes and Users between Hancen and Accela aren't sync'ed up
// explicity.  So we're using the StandardChoice option as a
// look-up table.
//****************************************************************
function getStandardChoiceValue(stdChoice, stdValue) {
    var strControl;
    var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(stdChoice, stdValue);

    if (bizDomScriptResult.getSuccess()) {
        var bizDomScriptObj = bizDomScriptResult.getOutput();
        strControl = "" + bizDomScriptObj.getDescription(); // had to do this or it bombs.  who knows why?
        aa.print("lookup(" + stdChoice + "," + stdValue + ") = " + strControl);
        //lookup(HANSEN_EMPID_TO_USERNAME,WAR07) = THANH.WARNER
    }
    else {
        aa.print("lookup(" + stdChoice + "," + stdValue + ") does not exist");
    }
    return strControl;
}

function getValueFromStandardChoice(inspectorCode) {
    var standardChoiceForBusinessRules = "HANSEN_EMPID_TO_USERNAME";
    return inspector = getStandardChoiceValue(standardChoiceForBusinessRules, inspectorCode);
}

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
// Set Custom Text fields - a.k.a. SingleAppSpecific
//****************************************************************
function setCustomTextField(capId, itemName, itemValue) {
    var useAppSpecificGroupName = false;
    //var itemName = "Historict District GIS";
    var itemGroup = null;
    return aa.appSpecificInfo.editSingleAppSpecific(capId, itemName, itemValue, itemGroup);

}

//****************************************************************
// Add Case Comments
//****************************************************************
function addCaseComment(capId, caseComment) {
    var currentUserID = aa.getAuditID();
    var comDate = aa.date.getCurrentDate();
    var vDispOnInsp = "N";
    var capCommentScriptModel = aa.cap.createCapCommentScriptModel();
    capCommentScriptModel.setCapIDModel(capId);
    capCommentScriptModel.setCommentType("APP LEVEL COMMENT");
    capCommentScriptModel.setSynopsis("");
    capCommentScriptModel.setText(caseComment);
    capCommentScriptModel.setAuditUser(currentUserID);
    capCommentScriptModel.setAuditStatus("A");
    capCommentScriptModel.setAuditDate(comDate);
    var capCommentModel = capCommentScriptModel.getCapCommentModel();
    capCommentModel.setDisplayOnInsp(vDispOnInsp);
    aa.cap.createCapComment(capCommentModel);
}

//****************************************************************
// Remove HTML tags
//****************************************************************
//function scrubHTML(html) {
//    var regex = /(<([^>]+)>)/ig;
//    return html.replace(regex, "");
//}

//****************************************************************
// Create Accela Cases from HansenRecords...
//****************************************************************
function createAccelaCases(serviceRequest) {
    aa.print("Begin createAccelaCases...");

    var requestType = serviceRequest.RequestType;
    aa.print("serviceRequest.RequestType: " + serviceRequest.RequestType);

    //capId = createCap("Enforcement/Case/NA/NA", requestType);
    var aCapType = "Enforcement/Case/NA/NA".split("/");
    if (aCapType.length != 4) {
        aa.print("**ERROR in createCap.  The following Application Type String is incorrectly formatted: Enforcement/Case/NA/NA");
        return false;
    }

    var appCreateResult = aa.cap.createApp(aCapType[0], aCapType[1], aCapType[2], aCapType[3], requestType);
    aa.print("Creating cap " + requestType);

    if (!appCreateResult.getSuccess()) {
        aa.print("**ERROR: creating CAP " + appCreateResult.getErrorMessage());
        return false;
    }

    capId = appCreateResult.getOutput();
    aa.print("CAP of type " + capId + " created successfully ");
    var newObj = aa.cap.getCap(capId).getOutput();	//Cap object

    aa.print("Newly created capId: " + capId)
    //aa.print("getCustomID()" + capId.getCustomID());

    CaseNumber = capId.getCustomID();
    aa.print("Newly created CaseNumber: " + CaseNumber);

    //Set Priority
    /////////////////////////////////////////////////////
    aa.print("editPriority...");
    //editPriority(serviceRequest.Priority);
    var itemCap = capId
    if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args

    var cdScriptObjResult = aa.cap.getCapDetail(itemCap);
    if (!cdScriptObjResult.getSuccess())
    { aa.print("**ERROR: No cap detail script object : " + cdScriptObjResult.getErrorMessage());  }

    var cdScriptObj = cdScriptObjResult.getOutput();

    if (!cdScriptObj)
    { aa.print("**ERROR: No cap detail script object");  }

    cd = cdScriptObj.getCapDetailModel();

    cd.setPriority(serviceRequest.Priority);

    cdWrite = aa.cap.editCapDetail(cd)

    if (cdWrite.getSuccess())
    { aa.print("updated priority to " + serviceRequest.Priority);  }
    else
    { aa.print("**ERROR writing capdetail : " + cdWrite.getErrorMessage());  }
    /////////////////////////////////////////////////////

    //aa.appSpecificInfo.editSingleAppSpecific(capId.getOutput(), hansenSRNo, '"' + ServiceRequestNumber + '"', itemGroup);
    var appSpecInfoResult = aa.appSpecificInfo.getByCapID(capId);
    var appspecObj = appSpecInfoResult.getOutput();
    aa.print("appSpecInfoResult: " + appSpecInfoResult);
    aa.print("appspecObj: " + appspecObj);

    //Set Hansen SR#
    aa.print("Set Hansen SR#...");

    var appSpecInfoUpdateResultHansenSRNo = aa.appSpecificInfo.editSingleAppSpecific(capId, hansenSRNo, serviceRequest.ServiceRequestNumber, itemGroup);
    aa.print("appSpecInfoUpdateResultHansenSRNo: " + appSpecInfoUpdateResultHansenSRNo);
    aa.print("appSpecInfoUpdateResultHansenSRNo getSuccess: " + appSpecInfoUpdateResultHansenSRNo.getSuccess());

    //Set Complaint 1 from Hansen Request Type - Mappings in the Hansen2Accela web service web.config
    aa.print("Set Complaint 1...");
    var appSpecInfoUpdateResultComp3 = aa.appSpecificInfo.editSingleAppSpecific(capId, complaint1, serviceRequest.Complaint, itemGroup);
    aa.print("appSpecInfoUpdateResultComp3: " + appSpecInfoUpdateResultComp3);
    aa.print("appSpecInfoUpdateResultComp3 getSuccess: " + appSpecInfoUpdateResultComp3.getSuccess());

    //Set Planning District from Hansen Sub Area per Nick James email 10/24/2016 12:42 PM EST
    aa.print("Planning District GIS...");
    aa.print("serviceRequest.SubArea: " + serviceRequest.SubArea)
    setCustomTextField(capId, "Planning District GIS", serviceRequest.SubArea);
                               
    //Set Historic District from from Hansen Area per Nick James email 10/24/2016 12:42 PM EST
    aa.print("Historict District GIS...");
    aa.print("serviceRequest.Area: " + serviceRequest.Area);
    setCustomTextField(capId, "Historict District GIS", serviceRequest.Area);

    aa.print("Set Call Date/Time...");
    var callDateTime = serviceRequest.CallDateTime;
    aa.print("callDateTime" + callDateTime);

    
    aa.print("Set Inspection/Inspector...");
    var daysAhead = 0;
    var inspTime = "12:00PM";
    var inspComm = "Created from HansenAccelaService";
    inspectorObj = getValueFromStandardChoice(serviceRequest.Inspector);
    //var inspector = getValueFromStandardChoice(jsonIn.GetHansenServiceReqResult[i].Inspector);
    aa.print("inspectorObj: " + inspectorObj);
    var userId = aa.people.getSysUserByID(inspectorObj);
    aa.print("userId: " + userId);
    aa.print("userId output: " + userId.getOutput());

    var schedRes = aa.inspection.scheduleInspection(capId, userId.getOutput(), aa.date.parseDate(dateAdd(null, daysAhead)), inspTime, iType, inspComm)

    if (schedRes.getSuccess())
        logDebug("Successfully scheduled inspection : " + iType + " for " + dateAdd(null, daysAhead));
    else
        logDebug("**ERROR: adding scheduling inspection (" + iType + "): " + schedRes.getErrorMessage());


    //Set Assign to Department to Housing and user
    var cdScriptObjResult = aa.cap.getCapDetail(capId);
    var cdScriptObj = cdScriptObjResult.getOutput();
    var cd = cdScriptObj.getCapDetailModel();
    cd.setAsgnDept("DAYTON/HOUSING/NA/NA/NA/NA/NA");
    cd.setAsgnStaff(inspectorObj);
    var cdWrite = aa.cap.editCapDetail(cd)


    //Add Comments
    aa.print("Add Record > Comments...");
    var workDescResult = aa.cap.getCapWorkDesByPK(capId);
    
    if (workDescResult.getSuccess()) {
        var workDescObj = workDescResult.getOutput();
        var workDesc = workDescObj.getDescription();
        workDesObj = workDescObj.getCapWorkDesModel()
        aa.print("serviceRequest.RequestComments: " + serviceRequest.RequestComments);
        aa.print("serviceRequest.CallComments: " + serviceRequest.CallComments);

        //6C62284A-539B-428D-9DDB-371CEB05A208 is a GUID that gets added in the HansenAccela web service
        var RequestComments = null;
        var CallComments = null;
        try {
            if (serviceRequest.RequestComments != null) {
                RequestComments = serviceRequest.RequestComments.replace(/6C62284A-539B-428D-9DDB-371CEB05A208/g, '\n');
            }
            if (serviceRequest.CallComments != null) {
                CallComments = serviceRequest.CallComments.replace(/6C62284A-539B-428D-9DDB-371CEB05A208/g, '\n');
            }
        }
        catch (err)
        { aa.print("ERROR trying to set comments: " + err);}
       
        aa.print("Line Feed Added RequestComments: " + RequestComments);
        aa.print("Line Feed Added CallComments: " + CallComments);
        if (RequestComments != null && CallComments != null) {
            workDescObj.setDescription(RequestComments + '\n\n' + CallComments);
        } else {
            if (RequestComments != null && CallComments == null) {
                workDescObj.setDescription(RequestComments);
            } else {
                if (RequestComments == null && CallComments != null) {
                    workDescObj.setDescription(CallComments);
                }
            }
        }
       

        //workDescObj.setDescription("Test Comments...");
        var editCapWorkDesScriptResult = aa.cap.editCapWorkDes(workDesObj);
        aa.print('\t' + "editCapWorkDesScriptResult.getSuccess(): " + editCapWorkDesScriptResult.getSuccess());
    } else { aa.print('\t' + "workDescResult.getErrorMessage(): " + workDescResult.getErrorMessage()); }


    /** Adding addresses(according to new address) to a record. **/
    //Set the new addressModel attributes.
    var serviceProviderCode = aa.getServiceProviderCode();
    var currentUserID = aa.getAuditID();
    var newAddressModel = aa.proxyInvoker.newInstance("com.accela.aa.aamain.address.AddressModel").getOutput();
    newAddressModel.setCapID(capId);
    newAddressModel.setServiceProviderCode(serviceProviderCode);
    newAddressModel.setAuditID(currentUserID);
    newAddressModel.setPrimaryFlag("Y");
    if (serviceRequest.StreetNumber) {
        try{
            var streetNumber = parseInt(serviceRequest.StreetNumber);
            newAddressModel.setHouseNumberStart(streetNumber);}
        catch(err){ aa.print("Convert Street Number Error: " + err);}}
    newAddressModel.setUnitStart(serviceRequest.SubDesignation);
    newAddressModel.setStreetDirection(serviceRequest.PreDir);
    newAddressModel.setStreetName(serviceRequest.StreetName);
    newAddressModel.setStreetSuffix(serviceRequest.Suffix);
    newAddressModel.setCity(serviceRequest.City);
    newAddressModel.setState(serviceRequest.State);
    newAddressModel.setRefAddressId(serviceRequest.ReferenceAddressId);


    var newAddressWithAPOAttribute = aa.address.createAddressWithAPOAttribute(capId, newAddressModel);
    aa.print("newAddressWithAPOAttribute: " + newAddressWithAPOAttribute); //ScriptResult object
    aa.print("newAddressWithAPOAttribute.getOutput(): " + newAddressWithAPOAttribute.getOutput()); //ScriptResult object

 //Add Parcel
    addParcelAndOwnerFromRefAddress(serviceRequest.ReferenceAddressId);


  refId = serviceRequest.ReferenceAddressId;

	var addResult = aa.address.getAddressByCapId(capId);
	if (addResult.getSuccess()) {
		var addArray = addResult.getOutput();
		if (addArray) {
			firstAddress = addArray[0];
		}
	}		
	refAddrResult = aa.address.getRefAddressByPK(String(refId));
	if (refAddrResult.getSuccess()) {
		refAddr = refAddrResult.getOutput();
		refAddressModel = refAddr.getRefAddressModel();
		refAttrs = refAddressModel.getAttributes();
		transAttrs = firstAddress.getAttributes();
		if(refAttrs != null){
			var refAttrsArr = refAttrs.toArray();
			for( var tIndex in refAttrsArr) {
				refAttribute = refAttrsArr[tIndex];
                                if (refAttribute.getAttributeValue() && refAttribute.getAttributeValue() != "") {
                                	editAppSpecific(refAttribute.getAttributeLabel(), "" + refAttribute.getAttributeValue());
					transAttrIter = transAttrs.iterator();
					while (transAttrIter.hasNext()) {
					    	transAttribute = transAttrIter.next();
						if (transAttribute.getB1AttributeName() == refAttribute.getAttributeName()) {
							transAttribute.setB1AttributeValue(refAttribute.getAttributeValue());
						}
                                        }
				}
			}

			var addrBiz = aa.proxyInvoker.newInstance("com.accela.aa.aamain.address.AddressBusiness").getOutput();
			if (addrBiz != null) {
				addrBiz.editAddressWithAPOAttribute(capId, firstAddress, transAttrs);
			}
		}
	}	


       //Set location text...
    if (serviceRequest.Location!=null) { updateShortNotes("Location from Hansen: " + serviceRequest.Location); }
    
    //Set Contact
    addContactFromServiceRequest(capId, serviceRequest);

    aa.print("New Case Created...Return to for loop!");
    return true;
}



function addContactFromServiceRequest(capId, serviceRequest) {

    var serviceProviderCode = aa.getServiceProviderCode();
    var currentUserID = aa.getAuditID();

    var newPeopleModel = aa.proxyInvoker.newInstance("com.accela.aa.aamain.people.PeopleModel").getOutput();
    aa.print("newPeopleModel: " + newPeopleModel);

    newPeopleModel.setServiceProviderCode(serviceProviderCode);
    newPeopleModel.setAuditID(currentUserID);
    newPeopleModel.setFirstName(serviceRequest.ContactNameFirst);
    newPeopleModel.setMiddleName(serviceRequest.ContactNameMiddle);
    newPeopleModel.setLastName(serviceRequest.ContactNameLast);
    newPeopleModel.setContactSeqNumber("1");
    newPeopleModel.setContactType("Contact");
    if (serviceRequest.ContactNameMiddle) { newPeopleModel.setFullName(serviceRequest.ContactNameFirst + " " + serviceRequest.ContactNameMiddle + " " + serviceRequest.ContactNameLast); }
    else { newPeopleModel.setFullName(serviceRequest.ContactNameFirst + " " + serviceRequest.ContactNameLast); }
    newPeopleModel.setFullName(serviceRequest.ContactNameFirst + serviceRequest.ContactNameMiddle + serviceRequest.ContactNameLast);
    if (serviceRequest.ContactPhoneHome != null) { newPeopleModel.setPhone1(serviceRequest.ContactPhoneHome); }
    if (serviceRequest.ContactPhoneMobile != null) { newPeopleModel.setPhone2(serviceRequest.ContactPhoneMobile); }
    if (serviceRequest.ContactPhoneBusiness != null) { newPeopleModel.setPhone3(serviceRequest.ContactPhoneBusiness); }
    if (serviceRequest.ContactEmail != null) { newPeopleModel.setEmail(serviceRequest.ContactEmail); }
    

    var ca = newPeopleModel.getCompactAddress();
    ca.setAddressLine1(serviceRequest.ContactAddress);
    ca.setZip(serviceRequest.ContactZip);
    ca.setCity(serviceRequest.ContactCity);
    ca.setState(serviceRequest.ContactState);
    newPeopleModel.setCompactAddress(ca)

    var newCapContactWithRefPeopleModel = aa.people.createCapContactWithRefPeopleModel(capId, newPeopleModel);

}

//****************************************************************
// Gets the CapIdModel object from the CapID string
//****************************************************************
function parseCapParts(newCapId) {
    var capPartsString = newCapId.toString();
    var capParts = capPartsString.split("-");
    var capPart1 = capParts[0];
    var capPart2 = capParts[1];
    var capPart3 = capParts[2];

    var capIDModel = aa.cap.getCapIDModel(capPart1, capPart2, capPart3);
    aa.print("capIDModel: " + capIDModel);
    aa.print("capIDModel.getOutput(): " + capIDModel.getOutput());

    return capIDModel;
}

//*********************************************************************************
// Create Accela Inspection record for the current capId as scoped in this js file
//*********************************************************************************
function addScheduleInspection(serviceRequest, inspector, daysAhead, inspTime, inspComm) {
    var inspectorObj = null;

    var schedRes = aa.inspection.scheduleInspection(capId, inspectorObj, aa.date.parseDate(dateAdd(null, daysAhead)), inspTime, iType, inspComm)

    if (schedRes.getSuccess())
        logDebug("Successfully scheduled inspection : " + iType + " for " + dateAdd(null, daysAhead));
    else
        logDebug("**ERROR: adding scheduling inspection (" + iType + "): " + schedRes.getErrorMessage());

    return schedRes;

}



//****************************************************************
//BEGIN ACTUAL PROCESSING...
//****************************************************************

//
//  Test update Hansen Service Request
//
//var successUpdateHansen = postToHansen(SetAccelaRecordId, '{"serviceRequestNumber":"1256156","AccelaRecordId":"TEST222"}');
//aa.print("successUpdateHansen: " + successUpdateHansen);

// Call to Hansen for un-processed Service Requests
var newHansenRequest = postToHansen(GetHansenServiceReq, "");
aa.print(newHansenRequest);

var capId = "";
var CaseNumber = "";
var ServiceRequestNumber = "";
if (typeof newHansenRequest !== "undefined") {

    var jsonIn = JSON.parse(newHansenRequest);

    var CaseNumbers = '{"CaseNumbers": [';
    aa.print("jsonIn.GetHansenServiceReqResult: " + jsonIn.GetHansenServiceReqResult);
    
    //Loop through all the new Hansen Service Requests...
    if(jsonIn.GetHansenServiceReqResult){
        for (var i = 0; i != jsonIn.GetHansenServiceReqResult.length; i++) {

            //aa.print(jsonIn.GetHansenServiceReqResult[i].RequestType);

            ServiceRequestNumber = jsonIn.GetHansenServiceReqResult[i].ServiceRequestNumber;
            //aa.print(ServiceRequestNumber);

            if(createAccelaCases(jsonIn.GetHansenServiceReqResult[i]) == true)
            {
                var comma = "";
                if (i > 0) { comma = ',' };

                CaseNumbers += comma + '{"serviceRequestNumber" : "' + ServiceRequestNumber + '", "AccelaRecordId" : "' + CaseNumber + '"}';
            }
        };

        CaseNumbers += "]}";

        //Case numbers are passed back to Hansen
        aa.print(CaseNumbers);
        CaseNumbers = JSON.parse(CaseNumbers).CaseNumbers;
        aa.print("CaseNumbers.CaseNumbers.length: " + CaseNumbers.length);

        for (var i = 0; i != CaseNumbers.length; i++) {
            aa.print("data out 1: " + JSON.stringify(CaseNumbers[i]));

           aa.print(postToHansen(SetAccelaRecordId, JSON.stringify(CaseNumbers[i])));
        };
    }
}

