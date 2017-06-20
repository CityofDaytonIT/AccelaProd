 /*------------------------------------------------------------------------------------------------------/
| Program : INCLUDES_LICENSES.js
| Event   : N/A
|
| 
/------------------------------------------------------------------------------------------------------*/
logDebug("Accessing INCLUDES_LICENSES");
var sendLicEmails = false;


/***********************************CREATE LICENSE FUNCTIONS*********************************************/
function issueBusinessLicense() {

	monthsToInitialExpire=12;
	newLicId = createParent(appTypeArray[0], appTypeArray[1], appTypeArray[2], "License",null); 
	if (newLicId) {
		copyOwner(capId, newLicId);
		newLicIdString = newLicId.getCustomID(); 
		updateAppStatus("Issued","Originally Issued",newLicId);  
		var ignore = lookup("EMSE:ASI Copy Exceptions","License/*/*/*"); 
		var ignoreArr = new Array(); 
		if(ignore != null) ignoreArr = ignore.split("|"); 
		copyAppSpecific(newLicId,ignoreArr);
		copyASITables(capId,newLicId);
		tmpNewDate = dateAddMonths(null, monthsToInitialExpire);
 		thisLic = new licenseObject(newLicIdString,newLicId) ; 
		thisLic.setExpiration(dateAdd(tmpNewDate,0)) ; 
		thisLic.setStatus("Active");
		changeApplicantToLicenseHolder(newLicId);
	}
	
} 


function issueProfessionalLicense() {
	
	// select statement to determine expiration date based on license type
	if (arguments.length > 0){
		var newLicId = aa.cap.getCapID(arguments[0]).getOutput()
		var newLicIdString = arguments[0]
	}
	else {
		newLicId = createParent(appTypeArray[0], appTypeArray[1], appTypeArray[2], "License",null);
		if (newLicId) {
			copyOwner(capId, newLicId);
			newLicIdString = newLicId.getCustomID(); 
			updateAppStatus("Issued","Originally Issued",newLicId);
			var ignore = lookup("EMSE:ASI Copy Exceptions","License/*/*/*"); 
			var ignoreArr = new Array();
			if(ignore != null) ignoreArr = ignore.split("|"); 
			copyAppSpecific(newLicId,ignoreArr);
			copyASITables(capId,newLicId);
			editAppSpecific("First Issuance Date", sysDateMMDDYYYY, newLicId);
			changeApplicantToLicenseHolder(newLicId);
 	
			thisLic = new licenseObject(newLicIdString,newLicId) ;
			expUnit = thisLic.b1Exp.getExpUnit();
			expInterval = thisLic.b1Exp.getExpInterval()	;
			var newExpDate;
                 	var currentYear = sysDate.getYear(); // Current year
			logDebug("Renewal Code is " + thisLic.getCode());
			currExpDate = thisLic.b1ExpDate;
			currExpJSDate = new Date(currExpDate);
			if (currExpJSDate < new Date()) {
				if (expUnit == "DAYS") {
					newExpDate = dateAdd(currExpDate, expInterval);
				 }
			 	 if (expUnit == "MONTHS") {
					 newExpDate = dateAddMonths(currExpDate, expInterval);
				 }
				 if (expUnit == "YEARS") {
					 newExpDate = dateAddMonths(currExpDate, expInterval * 12);
				 }
			}
			logDebug("the new exp date is " + newExpDate);
        		thisLic.setExpiration(newExpDate);
			// select statement to update expiration status based on ASI
			thisLic.setStatus("Active");
		}
	}
}
/***********************************RENEWAL FUNCTIONS***************************************************/
function processRenewalPayment() {
	var capID = getCapId();
	var partialCapID = getPartialCapID(capID);
	var parentLicenseCAPID = getParentLicenseCapID(capID)
	if (parentLicenseCAPID != null) {
		logDebug("Parent CAP ID :" + parentLicenseCAPID);
		// 2. Check to see if license is ready for renew, and check for full paying 
		//if (isReadyRenew(parentLicenseCAPID) && isRenewalCap(capID) && (checkFullPaying(capID)=="true")) {
		if (isReadyRenew(parentLicenseCAPID) && isRenewalCap(capID)) {
			if (isRenewalCompleteOnPayment(capID)) {
				//3. Associate current CAP with parent license CAP.
				var result = aa.cap.updateRenewalCapStatus(parentLicenseCAPID, capID);
				if (result.getSuccess()) {
					projectScriptModel = result.getOutput();
					aa.cap.updateAccessByACA(capID, "N");			
					if (projectScriptModel.RENEWAL_COMPLETE.equals(projectScriptModel.getStatus())) {
						if (activeLicense(parentLicenseCAPID)) {
							// copyKeyInfo(capID, parentLicenseCAPID);
							aa.cap.transferRenewCapDocument(partialCapID, parentLicenseCAPID, true);
							logDebug("Transfer document for renew cap. Source Cap: " + partialCapID + ", target Cap:" + parentLicenseCAPID);
		
							//5.1.3. Send auto-issurance license email to public user
						//	if (sendLicEmails) aa.expiration.sendAutoIssueLicenseEmail(parentLicenseCAPID);
						//	logDebug("send auto-issuance license email to citizen user.");
							aa.env.setValue("isAutoIssuanceSuccess", "Yes");
						}
						logDebug("CAP(" + parentLicenseCAPID + ") renewal is complete.");
					}
					else {
						//Send new license application notice agency user for approval
					//	if (sendLicEmails) aa.expiration.sendNoAutoIssueLicenseEmail(parentLicenseCAPID);
					//	logDebug("send no-auto-issuance license email to citizen user and agency user.");
						logDebug("CAP(" + parentLicenseCAPID + ") is ready for review.");
					}
				}	
				else { logDebug("ERROR: Failed to create renewal CAP : MasterCAP(. " + parentLicenseCAPID + ")  renewal CAP(" + capID + ")" + result.getErrorMessage()); }
			}
			else {
				var reviewResult = aa.cap.getProjectByChildCapID(capID, "Renewal", "Incomplete");
				if(reviewResult.getSuccess()) {
					projectScriptModels = reviewResult.getOutput();
					projectScriptModel = projectScriptModels[0];
					projectScriptModel.setStatus("Review");
					var updateResult = aa.cap.updateProject(projectScriptModel);
					if (updateResult.getSuccess()) {
						logDebug("Updated project status to review");
					}
					else { logDebug("Error updating project status to review: " + updateResult.getErrorMessage()); }
				}
				else { logDebug("Error getting Project By Child CapID"); }
			}
		}
	}
	else { logDebug("Parent CapID is null"); }
}

function completeRenewalOnWorkflow() {
	var capID = getCapId();
	var parentLicenseCAPID = getParentCapIDForReview(capID)
	if (parentLicenseCAPID != null) {
		if (isWorkflowApproveForReview(capID, aa.env.getValue("WorkflowTask"), aa.env.getValue("SD_STP_NUM"), aa.env.getValue("ProcessID"), aa.env.getValue("WorkflowStatus"))) {
			var partialCapID = getPartialCapID(capID);
			if (isReadyRenew(parentLicenseCAPID)) {
				renewalCapProject = getRenewalCapByParentCapIDForReview(parentLicenseCAPID);
				if (renewalCapProject != null) {
					aa.cap.updateAccessByACA(capID, "N");			
					if (activeLicense(parentLicenseCAPID)) {
						renewalCapProject.setStatus("Complete");
						logDebug("license(" + parentLicenseCAPID + ") is activated.");
						aa.cap.updateProject(renewalCapProject);
						// copyKeyInfo(capID, parentLicenseCAPID);
						aa.cap.transferRenewCapDocument(partialCapID, parentLicenseCAPID, false);
						logDebug("Transfer document for renew cap. Source Cap: " + partialCapID + ", target Cap: " + parentLicenseCAPID);
						if (sendLicEmails) aa.expiration.sendApprovedNoticEmailToCitizenUser(parentLicenseCAPID);
					}
				}
			}
		}
		if (isWorkflowDenyForReview(capID, aa.env.getValue("WorkflowTask"), aa.env.getValue("SD_STP_NUM"), aa.env.getValue("ProcessID"),  aa.env.getValue("WorkflowStatus"))) {
			if (isReadyRenew(parentLicenseCAPID)) {
				renewalCapProject = getRenewalCapByParentCapIDForReview(parentLicenseCAPID);
				if (renewalCapProject != null) {
					if (sendLicEmails) aa.expiration.sendDeniedNoticeEmailToCitizenUser(parentLicenseCAPID)
				}
			}
		}
	}
}

function convertRenewalToReal() {
	var capID = getCapId();
	var partialCapID = getPartialCapID(capID);
	var result = aa.cap.isRenewalInProgess(capID);
	if (result.getSuccess()) {
		//1. Set B1PERMIT.B1_ACCESS_BY_ACA to "N" for partial CAP to not allow that it is searched by ACA user.
		aa.cap.updateAccessByACA(capID, "N");			

		var parentLicenseCAPID = result.getOutput();
		//2 . Copy key information from child CAP to parent CAP.
		// logDebug("Copying key information from renewal CAP to license CAP");
		// copyKeyInfo(capID, parentLicenseCAPID);
	
		//3. move renew document to parent cap
		aa.cap.transferRenewCapDocument(partialCapID, parentLicenseCAPID, true);
		logDebug("Transfer document for renew cap. Source Cap: " + partialCapID + ", target Cap:" + parentLicenseCAPID);

		//4. Send auto-issurance license email to public user
		if (sendLicEmails) aa.expiration.sendAutoIssueLicenseEmail(parentLicenseCAPID);
		//logDebug("send auto-issuance license email to citizen user.");
		aa.env.setValue("isAutoIssuanceSuccess", "Yes");
	}
	else { logDebug("isRenewalInProgress returned error " + result.getErrorMessage()); }
}

function prepareAppForRenewal() {
	var partialCapId = getIncompleteCapId();
	var parentCapId = aa.env.getValue("ParentCapID");

	logDebug("Parent Cap id from environment = " + parentCapId);
	//1. Check to see if license is ready for renew
	if (isRenewProcess(parentCapId, partialCapId)) {
		logDebug("CAPID(" + parentCapId + ") is ready for renew. PartialCap (" + partialCapId + ")");
		//2. Associate partial cap with parent CAP.
		var result = aa.cap.createRenewalCap(parentCapId, partialCapId, true);
		if (result.getSuccess()) {
			//3. Copy key information from parent license to partial cap
			copyKeyInfo(parentCapId, partialCapId);
			//4. Set B1PERMIT.B1_ACCESS_BY_ACA to "N" for partial CAP to not allow that it is searched by ACA user.
			aa.cap.updateAccessByACA(partialCapId, "N");
		}
		else { logDebug("ERROR: Associate partial cap with parent CAP. " + result.getErrorMessage()); }
	}
	else { logDebug("This is not renewal process. PartialCapId = " + partialCapId + " ParentCapId = " + parentCapId); }
}

/******************************LIC PROF FUNCTIONS******************************************************/
function maintainLPLookup() {

	logDebug("Using LICENSESTATE = " + LICENSESTATE + " from EMSE:GlobalFlags"); //Issue State
	LICENSETYPE = appTypeArray[1] + " " + appTypeArray[2];  

	licCapId = null; isNewLic = false; licIDString = null;  licObj = null; licCap = null;
	// Get License CAP
	var searchCap = capId; var tmpId = capId; var prjArr = null;
	if (appMatch("*/*/License/NA") || appMatch("*/*/*/License")) {
		var childArr = getChildren("*/*/*/Application");
		if(childArr != null) searchCap = childArr[0];
	}
	capId = tmpId; var vRelationType = "R";
	if(appMatch("*/*/*/Renewal") || appMatch("*/*/Renewal/NA")) vRelationType="Renewal";

	var prjArrRes = aa.cap.getProjectByChildCapID(searchCap,vRelationType,null); 
	if(prjArrRes.getSuccess()) prjArr = prjArrRes.getOutput();
	if (prjArr != null) {
		for(prj in prjArr) {
			if(appMatch("*/*/*/License",prjArr[prj].getProjectID())) licCapId = prjArr[prj].getProjectID();
			if(appMatch("*/*/License/NA",prjArr[prj].getProjectID())) licCapId = prjArr[prj].getProjectID();
		}
	}
	
	logDebug("After search licCapId = " + licCapId);
	logDebug(appMatch("*/Amendment/*/*"));
	if (licCapId == null && (appMatch("*/*/*/License") || appMatch("*/*/License/NA"))) 
		licCapId = capId; //In the event license has no application
	if (appMatch("*/Amendment/*/*")) {
		logDebug("Amendment record")
		licCapId = getParent();
		logDebug("License parent " + licCapId);
		if (licCapId != null) {
			licCap = aa.cap.getCap(licCapId).getOutput();
	    	licAppTypeResult = licCap.getCapType();
	    	licAppTypeString = licAppTypeResult.toString();
	    	licAppTypeArray = licAppTypeString.split("/");
	    	LICENSETYPE = LICENSETYPE = licAppTypeArray[1] + " " + licAppTypeArray[2]; 
	    	logDebug("From amendment found lic cap " + licCapId + " license type " + LICENSETYPE);
		}
	}
	if (licCapId != null) { 
		licCapId = aa.cap.getCapID(licCapId.getID1(),licCapId.getID2(),licCapId.getID3()).getOutput(); 
		licIDString = licCapId.getCustomID();
		logDebug("Got Lic Cap " + licCapId.getCustomID());
	}
	logDebug(LICENSETYPE); //License Type to be populated
	licObj = licenseProfObjectBCC(licIDString,LICENSETYPE); //Get LicArray
	logDebug("Got licObj " + licObj);
	logDebug(licObj.valid);
	if (!licObj.valid && lookup("LICENSED PROFESSIONAL TYPE",LICENSETYPE) != null) {
		LPLookupCreateLP(licIDString, LICENSETYPE, LICENSESTATE);
	}
	logDebug(licIDString + ":" + LICENSETYPE)
	licObj = licenseProfObjectBCC(licIDString,LICENSETYPE);	
	if (licObj.valid) {
		LPLookupUpdateLP(licObj, licCapId, LICENSETYPE, LICENSESTATE);
	}
	else {
		logDebug("LP Not found to update");
	}
}

function LPLookupCreateLP(licNumber, licType, licState) {
	var vNewLic = aa.licenseScript.createLicenseScriptModel();
	vNewLic.setAgencyCode(aa.getServiceProviderCode());
	vNewLic.setAuditDate(sysDate);
	vNewLic.setAuditID(currentUserID);
	vNewLic.setAuditStatus("A");
	vNewLic.setLicenseType(licType);
	vNewLic.setLicState(licState);
	vNewLic.setStateLicense(licNumber);
	createResult = aa.licenseScript.createRefLicenseProf(vNewLic);
	if (createResult.getSuccess()) {
		logDebug("Successfully create LP " + licNumber);
	}
	else 
		logDebug("Error creating LP " + createResult.getErrorMessage());
}

function LPLookupUpdateLP(lObj, licCapId, licType, licState) {
	licCap = aa.cap.getCap(licCapId).getOutput();
	licCapType = licCap.getCapType().toString();
	licCapTypeArr = licCapType.split("/");
	licCapStatus = licCap.getCapStatus();
	lObj.refLicModel.setState(licState);
	lObj.refLicModel.setLicenseBoard(licType);
	lObj.refLicModel.setLicenseIssueDate(licCap.getFileDate());
	var expObj = null; var expDt = null; var expObjRes = aa.expiration.getLicensesByCapID(licCapId);
	if(expObjRes.getSuccess()) var expObj = expObjRes.getOutput();
	if (expObj != null) {
		expDt = aa.date.parseDate(expObj.getExpDateString());
		licObj.refLicModel.setLicenseExpirationDate(expDt); //Expiration Date
	} 
	updateLPAddressFromRecordContact(licCapId, "License Holder", "Mailing")
	if(licObj.updateFromRecordContactByType(licCapId,"License Holder",false,false)) 
		logDebug("Updated from License Holder"); 
	else 
		logDebug("Couldn't Update Contact Info");
	licObj.refLicModel.setBusinessName2(licCapStatus);
	logDebug("Lic Cap Status: " + licCapStatus);
	if (licObj.updateRecord())
		logDebug("LP Updated Successfully");
	else
		logDebug("LP Update Failed");
}


/**************************** SUPPORT FUNCTIONS*******************************************************/
function licenseProfObjectBCC(licnumber,lictype) 
{
	//Populate the License Model
	this.refLicModel = null;				//Reference LP Model
	this.infoTableGroupCodeObj = null;
	this.infoTableSubGroupCodesObj = null;
	this.infoTables = new Array();			//Table Array ex infoTables[name][row][column].getValue()
	this.attribs = new Array();				//Array of LP Attributes ex attribs[name]
	this.valid = false;						//true if LP is valid
	this.validTables = false;				//true if LP has infoTables
	this.validAttrs = false;				//true if LP has attributes
	
	logDebug("Retrieving LP record for " + aa.getServiceProviderCode() + "," + licnumber)
	var result = aa.licenseScript.getRefLicensesProfByLicNbr(aa.getServiceProviderCode(), licnumber);
	if (result.getSuccess())
	{
		var tmp = result.getOutput();
		if (lictype == null)
			lictype = "";
		if (tmp != null) {
			logDebug("Temp object is not null");
			for(lic in tmp) {
				tmpLicType = "" + tmp[lic].getLicenseType().toUpperCase();
				if(tmpLicType == lictype.toUpperCase() || lictype == ""){
					this.refLicModel = tmp[lic];
					if(lictype == ""){
						lictype=this.refLicModel.getLicenseType();
					}
					break;
				}
			}
		}
		else { logDebug("tmp object is null"); }
	}
	else {	logDebug("Error retrieving LP record" + result.getErrorMessage());	}
		
	//if(this.infoTableGroupCodeObj != null)
	//{
	//	var tmp = this.infoTableGroupCodeObj.getSubgroups();
	//	if(tmp != null)
	//		this.infoTableSubGroupCodesObj = tmp.toArray();
	//}
	
	//Set flags that can be used for validation
	//this.validTables = (this.infoTableSubGroupCodesObj != null);
	if (this.refLicModel != null) {
		this.valid = true;
	}
	else
		this.valid = false;
	//this.valid = (this.refLicModel != null);
	
	this.updateLPAddressFromRecordContact = function(vCapId,vContactType,vAddressType) {
		logDebug("In updateLPAddressFromRecordContact");
		this.retVal = false;
		if(this.valid){
			var conArr = new Array();
			var capContResult = aa.people.getCapContactByCapID(vCapId);	
			if (capContResult.getSuccess())
				{ conArr = capContResult.getOutput();  }
			else { retVal = false; }
			
			for(contact in conArr){
				if(vContactType.toString().toUpperCase()==
					conArr[contact].getPeople().getContactType().toString().toUpperCase()
					|| (vContactType.toString() == "" && conArr[contact].getPeople().getFlag() == "Y")){
						
					cont = conArr[contact];
					peop = cont.getPeople();
					addr = peop.getCompactAddress();
					capContactModel = cont.getCapContactModel(); 
					contactAddressListResult = aa.address.getContactAddressListByCapContact(capContactModel);
					if (contactAddressListResult.getSuccess()) { 
						contactAddressList = contactAddressListResult.getOutput();
						foundAddressType = false;
						for (var x in contactAddressList) {
							cal= contactAddressList[x];
							addrType = cal.getAddressType();
							if (addrType == vAddressType) {
								foundAddressType = true;
								contactAddressID = cal.getAddressID();
								cResult = aa.address.getContactAddressByPK(cal.getContactAddressModel());
								if (cResult.getSuccess()) {
									casm = cResult.getOutput(); // contactAddressScriptModel
									//aa.print(casm);
									this.refLicModel.setAddress1(casm.getAddressLine1());
									this.refLicModel.setAddress2(casm.getAddressLine2());
									this.refLicModel.setCity(casm.getCity());
									this.refLicModel.setState(casm.getState());
									this.refLicModel.setZip(casm.getZip());
								}
							}
						}	
					}
					//Audit Fields
					this.refLicModel.setAgencyCode(aa.getServiceProviderCode());
					this.refLicModel.setAuditDate(sysDate);
					this.refLicModel.setAuditID(currentUserID);
					this.refLicModel.setAuditStatus("A");
					
					retVal = true;
					break;
				}
			}
		}
		return retVal;
	}
	
	
	
	
	//Update From Record Contact by Contact Type
	//Uses first contact of type found
	//If contactType == "" then uses primary
	this.updateFromRecordContactByType = function(vCapId,vContactType,vUpdateAddress,vUpdatePhoneEmail){
		this.retVal = false;
		if(this.valid){
			var conArr = new Array();
			var capContResult = aa.people.getCapContactByCapID(vCapId);
			
			if (capContResult.getSuccess())
				{ conArr = capContResult.getOutput();  }
			else { retVal = false; }
			
			for(contact in conArr){
				if(vContactType.toString().toUpperCase()==
					conArr[contact].getPeople().getContactType().toString().toUpperCase()
					|| (vContactType.toString() == "" && conArr[contact].getPeople().getFlag() == "Y")){
						
					cont = conArr[contact];
					peop = cont.getPeople();
					addr = peop.getCompactAddress();
	
					this.refLicModel.setContactFirstName(cont.getFirstName());
					this.refLicModel.setContactMiddleName(peop.getMiddleName());  //get mid from peop
					this.refLicModel.setContactLastName(cont.getLastName());
					this.refLicModel.setBusinessName(peop.getBusinessName());
					if(vUpdateAddress){
						this.refLicModel.setAddress1(addr.getAddressLine1());
						this.refLicModel.setAddress2(addr.getAddressLine2());
						this.refLicModel.setAddress3(addr.getAddressLine3());
						this.refLicModel.setCity(addr.getCity());
						this.refLicModel.setState(addr.getState());
						this.refLicModel.setZip(addr.getZip());
					}
					if(vUpdatePhoneEmail){
						this.refLicModel.setPhone1(peop.getPhone1());
						this.refLicModel.setPhone2(peop.getPhone2());
						this.refLicModel.setPhone3(peop.getPhone3());
						this.refLicModel.setEMailAddress(peop.getEmail());
						this.refLicModel.setFax(peop.getFax());
					}
					//Audit Fields
					this.refLicModel.setAgencyCode(aa.getServiceProviderCode());
					this.refLicModel.setAuditDate(sysDate);
					this.refLicModel.setAuditID(currentUserID);
					this.refLicModel.setAuditStatus("A");
					
					retVal = true;
					break;
				}
			}
		}
		return retVal;
	}
	
	this.updateFromAddress = function(vCapId){
		this.retVal = false;
		if(this.valid){
			var capAddressResult = aa.address.getAddressByCapId(vCapId);
			var addr = null;
			if (capAddressResult.getSuccess()){
				Address = capAddressResult.getOutput();
				for (yy in Address){
					if ("Y"==Address[yy].getPrimaryFlag()){
						addr = Address[yy];
						logDebug("Target CAP has primary address");
						break;
					}
				}
				if(addr == null){
					addr = Address[0];
				}
			}
			else{
				logMessage("**ERROR: Failed to get addresses: " + capAddressResult.getErrorMessage());
			}
			
			if(addr != null){
				var addrLine1 = addr.getAddressLine1();
				if(addrLine1 == null){
					addrLine1 = addr.getHouseNumberStart();
					addrLine1 += (addr.getStreetDirection() != null? " " + addr.getStreetDirection(): "");
					addrLine1 += (addr.getStreetName() != null? " " + addr.getStreetName(): "");
					addrLine1 += (addr.getStreetSuffix() != null? " " + addr.getStreetSuffix(): "");
					addrLine1 += (addr.getUnitType() != null? " " + addr.getUnitType(): "");
					addrLine1 += (addr.getUnitStart() != null? " " + addr.getUnitStart(): "");
				}
				this.refLicModel.setAddress1(addrLine1);
				this.refLicModel.setAddress2(addr.getAddressLine2());
				this.refLicModel.setCity(addr.getCity());
				this.refLicModel.setState(addr.getState());
				this.refLicModel.setZip(addr.getZip());
				retVal = true;
			}
			else{ 
				retVal = false;	
			}
		}
		return retVal;
	}
	
	//Update From Record Licensed Prof
	//License Number and Type must match that of the Record License Prof
	this.updateFromRecordLicensedProf = function(vCapId){
		var retVal = false;
		if(this.valid){
			
			var capLicenseResult = aa.licenseProfessional.getLicenseProf(capId);
			var capLicenseArr = new Array();
			if (capLicenseResult.getSuccess())
				{ capLicenseArr = capLicenseResult.getOutput();  }
			else
				{  retVal = false; }
				
			for(capLic in capLicenseArr){
				if(capLicenseArr[capLic].getLicenseNbr()+"" == this.refLicModel.getStateLicense()+"" 
					&& capLicenseArr[capLic].getLicenseType()+"" == this.refLicModel.getLicenseType()+""){
					
					licProfScriptModel = capLicenseArr[capLic];

					this.refLicModel.setAddress1(licProfScriptModel.getAddress1());
					this.refLicModel.setAddress2(licProfScriptModel.getAddress2());
					this.refLicModel.setAddress3(licProfScriptModel.getAddress3());
					this.refLicModel.setAgencyCode(licProfScriptModel.getAgencyCode());
					this.refLicModel.setAuditDate(licProfScriptModel.getAuditDate());
					this.refLicModel.setAuditID(licProfScriptModel.getAuditID());
					this.refLicModel.setAuditStatus(licProfScriptModel.getAuditStatus());
					this.refLicModel.setBusinessLicense(licProfScriptModel.getBusinessLicense());
					this.refLicModel.setBusinessName(licProfScriptModel.getBusinessName());
					this.refLicModel.setCity(licProfScriptModel.getCity());
					this.refLicModel.setCityCode(licProfScriptModel.getCityCode());
					this.refLicModel.setContactFirstName(licProfScriptModel.getContactFirstName());
					this.refLicModel.setContactLastName(licProfScriptModel.getContactLastName());
					this.refLicModel.setContactMiddleName(licProfScriptModel.getContactMiddleName());
					this.refLicModel.setContryCode(licProfScriptModel.getCountryCode());
					this.refLicModel.setCountry(licProfScriptModel.getCountry());
					this.refLicModel.setEinSs(licProfScriptModel.getEinSs());
					this.refLicModel.setEMailAddress(licProfScriptModel.getEmail());
					this.refLicModel.setFax(licProfScriptModel.getFax());
					this.refLicModel.setLicOrigIssDate(licProfScriptModel.getLicesnseOrigIssueDate());
					this.refLicModel.setPhone1(licProfScriptModel.getPhone1());
					this.refLicModel.setPhone2(licProfScriptModel.getPhone2());
					this.refLicModel.setSelfIns(licProfScriptModel.getSelfIns());
					this.refLicModel.setState(licProfScriptModel.getState());
					this.refLicModel.setLicState(licProfScriptModel.getState());
					this.refLicModel.setSuffixName(licProfScriptModel.getSuffixName());
					this.refLicModel.setWcExempt(licProfScriptModel.getWorkCompExempt());
					this.refLicModel.setZip(licProfScriptModel.getZip());
					
					//new
					this.refLicModel.setFein(licProfScriptModel.getFein());
					//licProfScriptModel.getBirthDate()
					//licProfScriptModel.getTitle()
					this.refLicModel.setPhone3(licProfScriptModel.getPhone3());
					this.refLicModel.setBusinessName2(licProfScriptModel.getBusName2());
					
					retVal = true;
				}
			}
		}
		return retVal;
	}
	
	//Copy Reference Licensed Professional to a Record
	//If replace is true will remove and readd lic_prof
	//Currently wont copy infoTables...
	this.copyToRecord = function(vCapId,vReplace){
		var retVal = false;
		if(this.valid){	
			var capLicenseResult = aa.licenseProfessional.getLicenseProf(vCapId);
			var capLicenseArr = new Array();
			var existing = false;
			if (capLicenseResult.getSuccess())
				{ capLicenseArr = capLicenseResult.getOutput();  }
				
			if(capLicenseArr != null){
				for(capLic in capLicenseArr){
					if(capLicenseArr[capLic].getLicenseNbr()+"" == this.refLicModel.getStateLicense()+"" 
						&& capLicenseArr[capLic].getLicenseType()+"" == this.refLicModel.getLicenseType()+""){
							if(vReplace){
								aa.licenseProfessional.removeLicensedProfessional(capLicenseArr[capLic]);
								break;
							}
							else{
								existing=true;
							}
						}
				}
			}
			
			if(!existing){
				capListResult = aa.licenseScript.associateLpWithCap(vCapId,this.refLicModel);
				retVal = capListResult.getSuccess();
				//Add peopleInfoTables via Workaround (12ACC-00186)
				if(this.validTables && retVal){
					var tmpLicProfObj = aa.licenseProfessional.getLicenseProfessionScriptModel().getOutput();
					this.infoTableGroupCodeObj.setCapId1(vCapId.getID1());
					this.infoTableGroupCodeObj.setCapId2(vCapId.getID2());
					this.infoTableGroupCodeObj.setCapId3(vCapId.getID3());
					//save ref values
					var tmpRefId = this.infoTableGroupCodeObj.getReferenceId();
					var tmpRefType = this.infoTableGroupCodeObj.getReferenceType();
					var tmpRefDesc = this.infoTableGroupCodeObj.getReferenceDesc();
					//update Ref Values
					this.infoTableGroupCodeObj.setReferenceId(this.refLicModel.getStateLicense());
					this.infoTableGroupCodeObj.setReferenceType(this.refLicModel.getLicenseType());
					this.infoTableGroupCodeObj.setReferenceDesc("Description");
					this.infoTableGroupCodeObj.setCategory(1);
					tmpLicProfObj.setInfoTableGroupCodeModel(this.infoTableGroupCodeObj);
					aa.licenseProfessional.createInfoTable(tmpLicProfObj);
					//Set the cap back to null
					this.infoTableGroupCodeObj.setCapId1(null);
					this.infoTableGroupCodeObj.setCapId2(null);
					this.infoTableGroupCodeObj.setCapId3(null);
					//Set the ref values back
					this.infoTableGroupCodeObj.setReferenceId(tmpRefId);
					this.infoTableGroupCodeObj.setReferenceType(tmpRefType);
					this.infoTableGroupCodeObj.setReferenceDesc(tmpRefDesc);
				}
			}
		}
		return retVal;
	}
	
	this.enable = function(){
		this.refLicModel.setAuditStatus("A");
	}
	this.disable = function(){
		this.refLicModel.setAuditStatus("I");
	}
	
	//get records associated to license
	this.getAssociatedRecords = function(){
		var retVal = new Array();
		if(this.valid){
			var resObj = aa.licenseScript.getCapIDsByLicenseModel(this.refLicModel);
			if(resObj.getSuccess()){
				var tmp = resObj.getOutput();
				if(tmp != null) //make sure your not setting to null otherwise will not work like array
					retVal = tmp;
			}
		}
		return retVal;
	}
	
	//Save Changes to this object to Ref Licensed Professional
	this.updateRecord = function(){
		var retVal = false
		if (this.valid)
		{
			//this.refreshTables(); //Must ensure row#s are good or wont show in ACA
			var res = aa.licenseScript.editRefLicenseProf(this.refLicModel);
			retVal = res.getSuccess();
		}
		return retVal;
	}
	

	
	return this	
}

function isRenewalCompleteOnPayment(capId) {
	var cap = aa.cap.getCap(capId).getOutput();
	var appTypeResult = cap.getCapType();
	var appTypeString = appTypeResult.toString();
	var ans = lookup("RENEWAL_COMPLETE_ON_PAYMENT", appTypeString);
	if (ans == "TRUE") {
		return true;
	}
	return false;
}

function getParentLicenseCapID(capid) {
	if (capid == null || aa.util.instanceOfString(capid)) { return null; }
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", "Incomplete");
	if(result.getSuccess() ) {
		projectScriptModels = result.getOutput();
		projectScriptModel = projectScriptModels[0];
		return projectScriptModel.getProjectID();
	}
	else {
		return getParentCapVIAPartialCap(capid);
	}
}
function getParentCapVIAPartialCap(capid) {
	var result2 = aa.cap.getProjectByChildCapID(capid, "Renewal", "Incomplete");
	if(result2.getSuccess()) {
		licenseProjects = result2.getOutput();
		if (licenseProjects == null || licenseProjects.length == 0) {
			logDebug("ERROR: Failed to get parent CAP with partial CAPID(" + capid + ")");
			return null;
		}
		licenseProject = licenseProjects[0];
		// update renewal relationship from partial cap to real cap
		updateRelationship2RealCAP(licenseProject.getProjectID(), capid);
		//Return parent license CAP ID.
		return licenseProject.getProjectID();
	}
	else { return null; }
}

function updateRelationship2RealCAP(parentLicenseCAPID, capID) {
	var result = aa.cap.createRenewalCap(parentLicenseCAPID, capID, false);
	if (result.getSuccess()) {
		var projectScriptModel = result.getOutput();
		projectScriptModel.setStatus("Incomplete");
		var result1 = aa.cap.updateProject(projectScriptModel);
		if (!result1.getSuccess()) {
			logDebug("ERROR: Failed update relationship status CAPID(" + capID + "): " + result1.getErrorMessage());
		}
	}
	else { logDebug("ERROR: Failed to create renewal relationship parentCAPID(" + parentLicenseCAPID + "),CAPID(" + capid + "): " + result.getErrorMessage()); }
}

function checkFullPaying(capid){
	var checkResult = aa.fee.isFullPaid4Renewal(capid);
	if (!checkResult.getSuccess()) {
		logDebug("ERROR: Failed to check full paying, renewal CAP(" + capid + "). " + result.getErrorMessage());
		return false;
	}
	var fullPaid = checkResult.getOutput();
	if(fullPaid == "false") {
		logDebug("The fee items is not full paid, please pay and apply the Fee items in the renewal CAP "+capid);
	}
	return "true";
}

function isRenewalCap(capid)
{
	if (capid == null || aa.util.instanceOfString(capid))
	{
		return false;
	}
	//1. Check to see if it is renewal CAP. 
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", null);
	if(result.getSuccess())
	{
		projectScriptModels = result.getOutput();
		if (projectScriptModels != null && projectScriptModels.length > 0)
		{
			return true;
		}
	}
	return false;
}

function isWorkflowApproveForReview(capID, wfTask, stepNum, processID, taskStatus) {
	if (capID == null || aa.util.instanceOfString(capID) || stepNum == null || processID == null || wfTask == null || taskStatus == null) {
		return false;
	}
	if (wfTask.length()  == 0) { return false; }
	//1. Get workflow task item
	var result = aa.workflow.getTask(capID, stepNum, processID);
    	if(result.getSuccess()) {
		taskItemScriptModel = result.getOutput();
		if (taskItemScriptModel == null) {
			logDebug("ERROR: Failed to get workflow task with CAPID(" + capID + ") for review");
			return false;
		}
		//2. Check to see if the agency user approve renewal application .
		if (taskItemScriptModel.getTaskDescription().equals(wfTask) && "Renewal Status".equals(wfTask) && ( "Approved".equals(taskStatus) || "Approved Inactive".equals(taskStatus) || "Approved Active".equals(taskStatus)) ) {
			return true;
		}	
		if (taskItemScriptModel.getTaskDescription().equals(wfTask) && "Application Review".equals(wfTask) && ( "Approved".equals(taskStatus) || "Approved - Complete".equals(taskStatus)) ) {
			return true;
		}	
		if (taskItemScriptModel.getTaskDescription().equals(wfTask) && "Issuance".equals(wfTask) && ( "Complete".equals(taskStatus)) ) {
			return true;
		}	

	}  
    	else { logDebug("ERROR: Failed to get workflow task(" + capID + ") for review: " + result.getErrorMessage()); }
	return false;
}

function isWorkflowDenyForReview(capID, wfTask, stepNum, processID, taskStatus) {
	if (capID == null || aa.util.instanceOfString(capID) || stepNum == null || processID == null || wfTask == null || taskStatus == null) {
		return false;
	}
	if (wfTask.length()  == 0) { return false; }
	//1. Get workflow task item
	var result = aa.workflow.getTask(capID, stepNum, processID);
    	if(result.getSuccess()) {
		taskItemScriptModel = result.getOutput();
		if (taskItemScriptModel == null) {
			logDebug("ERROR: Failed to get workflow task with CAPID(" + capID + ") for review");
			return false;
		}
		//2. Check to see if the agency user approve renewal application .
		if (taskItemScriptModel.getTaskDescription().equals(wfTask) && "Renewal Status".equals(wfTask) && "Denied".equals(taskStatus)) {
			return true;
		}	
	}  
    	else { logDebug("ERROR: Failed to get workflow task(" + capID + ") for review: " + result.getErrorMessage()); }
	return false;
}

function activeLicense(capid)
{
	if (capid == null || aa.util.instanceOfString(capid))
	{
		return false;
	}
	//1. Set status to "Active", and update expired date.
	var result = aa.expiration.activeLicensesByCapID(capid);
	if(result.getSuccess())
	{
		return true;
	}  
	else 
	{
	  aa.print("ERROR: Failed to activate License with CAP(" + capid + "): " + result.getErrorMessage());
	}
	return false;
}

function getParentCapIDForReview(capid) {
	// for Longmont licensing, renewals may/may not have payments. Need to look for
	// project status of Review and Incomplete
	if (capid == null || aa.util.instanceOfString(capid)) {
		return null;
	}
	//1. Get parent license for review
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", "Review");
    	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (!(projectScriptModels == null || projectScriptModels.length == 0)) {
			projectScriptModel = projectScriptModels[0];
			return projectScriptModel.getProjectID();
		}
	}  
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", "Incomplete");
    	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (!(projectScriptModels == null || projectScriptModels.length == 0)) {
			projectScriptModel = projectScriptModels[0];
			return projectScriptModel.getProjectID();
		}
	}  
	aa.print("ERROR: Failed to get Parent Cap ID");
	return null;
}

function getRenewalCapByParentCapIDForReview(parentCapid) {
	if (parentCapid == null || aa.util.instanceOfString(parentCapid)) {
		return null;
	}
	//1. Get parent license for review
	var result = aa.cap.getProjectByMasterID(parentCapid, "Renewal", "Review");
    	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (!(projectScriptModels == null || projectScriptModels.length == 0)) {
			projectScriptModel = projectScriptModels[0];
			return projectScriptModel;
		}
	}  
	var result = aa.cap.getProjectByMasterID(parentCapid, "Renewal", "Incomplete");
    	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (!(projectScriptModels == null || projectScriptModels.length == 0)) {
			projectScriptModel = projectScriptModels[0];
			return projectScriptModel;
		}
	}  
	aa.print("ERROR: Failed to get Parent Cap ID");
      return null;
}


function isRenewProcess(parentCapID, partialCapID) {
	//1. Check to see parent CAP ID is null.
	if (parentCapID == null || partialCapID == null || aa.util.instanceOfString(parentCapID)) {
		return false;
	}
	//2. Get CAPModel by PK for partialCAP.
	var result = aa.cap.getCap(partialCapID);
	if(result.getSuccess()) {
		capScriptModel = result.getOutput();
		//2.1. Check to see if it is partial CAP.	
		if (capScriptModel.isCompleteCap()) {
			logDebug("ERROR: It is not partial CAP(" + capScriptModel.getCapID() + ")");
			return false;
		}
	}
	else {
		logDebug("ERROR: Fail to get CAPModel (" + partialCapID + "): " + result.getErrorMessage());
		return false;
	}
	//3.  Check to see if the renewal was initiated before. 
	result = aa.cap.getProjectByMasterID(parentCapID, "Renewal", "Incomplete");
	if(result.getSuccess()) {
		partialProjects = result.getOutput();
		if (partialProjects != null && partialProjects.length > 0) {
			//Avoid to initiate renewal process multiple times.
			logDebug("Warning: Renewal process was initiated before. ( "+ parentCapID + ")");
			return false;
		}
		
	}
	//4 . Check to see if parent CAP is ready for renew.
	return isReadyRenew(parentCapID);
}

function isReadyRenew(capid) {
	if (capid == null || aa.util.instanceOfString(capid)) {
		return false;
	}
	var result = aa.expiration.isExpiredLicenses(capid);
    	if(result.getSuccess()) {
		return true;
	}  
    	else { logDebug("ERROR: Failed to get expiration with CAP(" + capid + "): " + result.getErrorMessage()); }
	return false;
}

function getIncompleteCapId()  {
    	var s_id1 = aa.env.getValue("PermitId1");
   	var s_id2 = aa.env.getValue("PermitId2");
    	var s_id3 = aa.env.getValue("PermitId3");

    	var result = aa.cap.getCapIDModel(s_id1, s_id2, s_id3);
    	if(result.getSuccess()) {
    		return result.getOutput();
	}  
    	else { logDebug("ERROR: Failed to get capId: " + result.getErrorMessage()); return null; }
}

function getPartialCapID(capid) {
	if (capid == null || aa.util.instanceOfString(capid)) {
		return null;
	}
	//1. Get original partial CAPID  from related CAP table.
	var result = aa.cap.getProjectByChildCapID(capid, "EST", null);
	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (projectScriptModels == null || projectScriptModels.length == 0) {
			logDebug("ERROR: Failed to get partial CAP with CAPID(" + capid + ")");
			return null;
		}
		//2. Get original partial CAP ID from project Model
		projectScriptModel = projectScriptModels[0];
		return projectScriptModel.getProjectID();
	}  
	else { logDebug("ERROR: Failed to get partial CAP by child CAP(" + capid + "): " + result.getErrorMessage()); return null; }
}


function copyKeyInfo(srcCapId, targetCapId) {
	copyAppSpecificInfoForLic(srcCapId, targetCapId);
	copyAddressForLic(srcCapId, targetCapId);
	copyAppSpecificTableForLic(srcCapId, targetCapId);
	copyParcelForLic(srcCapId, targetCapId);
	copyPeopleForLic(srcCapId, targetCapId);
	copyLicenseProfessionalForLic(srcCapId, targetCapId);
	copyOwnerForLic(srcCapId, targetCapId);
	copyCapConditionForLic(srcCapId, targetCapId);
	copyAdditionalInfoForLic(srcCapId, targetCapId);
	if (vEventName == "ConvertToRealCapAfter") {
		copyEducation(srcCapId, targetCapId);
		copyContEducation(srcCapId, targetCapId);
		copyExamination(srcCapId, targetCapId);
		var currentUserID = aa.env.getValue("CurrentUserID");
		copyRenewCapDocument(srcCapId, targetCapId ,currentUserID);
	}
}

function copyRenewCapDocument(srcCapId, targetCapId,currentUserID)
{
	if(srcCapId != null && targetCapId != null)
	{
		aa.cap.copyRenewCapDocument(srcCapId, targetCapId,currentUserID);
	}
}

function copyEducation(srcCapId, targetCapId) {
	if(srcCapId != null && targetCapId != null) {
		aa.education.copyEducationList(srcCapId, targetCapId);
	}
}

function copyContEducation(srcCapId, targetCapId) {
	if(srcCapId != null && targetCapId != null) {
		aa.continuingEducation.copyContEducationList(srcCapId, targetCapId);
	}
}

function copyExamination(srcCapId, targetCapId) {
	if(srcCapId != null && targetCapId != null) {
		aa.examination.copyExaminationList(srcCapId, targetCapId);
	}
}

function copyAppSpecificInfoForLic(srcCapId, targetCapId)
{
	var ignore = lookup("EMSE:ASI Copy Exceptions","License/*/*/*");
	logDebug("Ignore = " + ignore);
	var ignoreArr = new Array();
	if(ignore != null) ignoreArr = ignore.split("|"); 
	var AppSpecInfo = new Array();
	useAppSpecificGroupName = true;
	loadAppSpecific(AppSpecInfo,srcCapId);
	copyAppSpecificForLic(AppSpecInfo,targetCapId, ignoreArr);
	useAppSpecificGroupName = false;
}
	
function copyAppSpecificForLic(AInfo,newCap) // copy all App Specific info into new Cap, 1 optional parameter for ignoreArr
{
	var ignoreArr = new Array();
	var limitCopy = false;
	if (arguments.length > 2) {
		ignoreArr = arguments[2];
		limitCopy = true;
	}
	
	for (asi in AInfo){
		if(limitCopy){
			var ignore=false;
		  	for(var i = 0; i < ignoreArr.length; i++) {
				if (asi.indexOf(ignoreArr[i]) == 0) {
		  		//if(ignoreArr[i] == asi){
					logDebug("ignoring " + asi);
		  			ignore=true;
		  			break;
		  		}
			}
			if (!ignore) editAppSpecific(asi,AInfo[asi],newCap);
		}
		else 
			editAppSpecific(asi,AInfo[asi],newCap);
	}
}

function copyLicenseProfessionalForLic(srcCapId, targetCapId) {
	//1. Get license professionals with source CAPID.
	var capLicenses = getLicenseProfessionalForLic(srcCapId);
	if (capLicenses == null || capLicenses.length == 0) {
		return;
	}
	//2. Get license professionals with target CAPID.
	var targetLicenses = getLicenseProfessionalForLic(targetCapId);
	//3. Check to see which licProf is matched in both source and target.
	for (loopk in capLicenses) {
		sourcelicProfModel = capLicenses[loopk];
		//3.1 Set target CAPID to source lic prof.
		sourcelicProfModel.setCapID(targetCapId);
		targetLicProfModel = null;
		//3.2 Check to see if sourceLicProf exist.
		if (targetLicenses != null && targetLicenses.length > 0) {
			for (loop2 in targetLicenses) {
				if (isMatchLicenseProfessional(sourcelicProfModel, targetLicenses[loop2])) {
					targetLicProfModel = targetLicenses[loop2];
					break;
				}
			}
		}
		//3.3 It is a matched licProf model.
		if (targetLicProfModel != null) {
			//3.3.1 Copy information from source to target.
			aa.licenseProfessional.copyLicenseProfessionalScriptModel(sourcelicProfModel, targetLicProfModel);
			//3.3.2 Edit licProf with source licProf information. 
			aa.licenseProfessional.editLicensedProfessional(targetLicProfModel);
		}
		//3.4 It is new licProf model.
		else {
			//3.4.1 Create new license professional.
			aa.licenseProfessional.createLicensedProfessional(sourcelicProfModel);
		}
	}
}

function isMatchLicenseProfessional(licProfScriptModel1, licProfScriptModel2)
{
	if (licProfScriptModel1 == null || licProfScriptModel2 == null)
	{
		return false;
	}
	if (licProfScriptModel1.getLicenseType().equals(licProfScriptModel2.getLicenseType())
		&& licProfScriptModel1.getLicenseNbr().equals(licProfScriptModel2.getLicenseNbr()))
	{
		return true;
	}
	return	false;
}

function getLicenseProfessionalForLic(capId)
{
	capLicenseArr = null;
	var s_result = aa.licenseProfessional.getLicenseProf(capId);
	if(s_result.getSuccess())
	{
		capLicenseArr = s_result.getOutput();
		if (capLicenseArr == null || capLicenseArr.length == 0)
		{
			logDebug("WARNING: no licensed professionals on this CAP:" + capId);
			capLicenseArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to license professional: " + s_result.getErrorMessage());
		capLicenseArr = null;	
	}
	return capLicenseArr;
}


function copyAddressForLic(srcCapId, targetCapId)
{
	//1. Get address with source CAPID.
	var capAddresses = getAddressForLic(srcCapId);
	if (capAddresses == null || capAddresses.length == 0)
	{
		return;
	}
	//2. Get addresses with target CAPID.
	var targetAddresses = getAddressForLic(targetCapId);
	//3. Check to see which address is matched in both source and target.
	for (loopk in capAddresses)
	{
		sourceAddressfModel = capAddresses[loopk];
		//3.1 Set target CAPID to source address.
		sourceAddressfModel.setCapID(targetCapId);
		targetAddressfModel = null;
		//3.2 Check to see if sourceAddress exist.
		if (targetAddresses != null && targetAddresses.length > 0)
		{
			for (loop2 in targetAddresses)
			{
				if (isMatchAddress(sourceAddressfModel, targetAddresses[loop2]))
				{
					targetAddressfModel = targetAddresses[loop2];
					break;
				}
			}
		}
		//3.3 It is a matched address model.
		if (targetAddressfModel != null)
		{
		
			//3.3.1 Copy information from source to target.
			aa.address.copyAddressModel(sourceAddressfModel, targetAddressfModel);
			//3.3.2 Edit address with source address information. 
			aa.address.editAddressWithAPOAttribute(targetCapId, targetAddressfModel);
		}
		//3.4 It is new address model.
		else
		{	
			//3.4.1 Create new address.
			aa.address.createAddressWithAPOAttribute(targetCapId, sourceAddressfModel);
		}
	}
}

function isMatchAddress(addressScriptModel1, addressScriptModel2)
{
	if (addressScriptModel1 == null || addressScriptModel2 == null)
	{
		return false;
	}
	var streetName1 = addressScriptModel1.getStreetName();
	var streetName2 = addressScriptModel2.getStreetName();
	if ((streetName1 == null && streetName2 != null) 
		|| (streetName1 != null && streetName2 == null))
	{
		return false;
	}
	if (streetName1 != null && !streetName1.equals(streetName2))
	{
		return false;
	}
	return true;
}

function getAddressForLic(capId)
{
	capAddresses = null;
	var s_result = aa.address.getAddressByCapId(capId);
	if(s_result.getSuccess())
	{
		capAddresses = s_result.getOutput();
		if (capAddresses == null || capAddresses.length == 0)
		{
			logDebug("WARNING: no addresses on this CAP:" + capId);
			capAddresses = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to address: " + s_result.getErrorMessage());
		capAddresses = null;	
	}
	return capAddresses;
}

function copyAppSpecificTableForLic(srcCapId, targetCapId)
{
	var tableNameArray = getTableName(srcCapId);
	var targetTableNameArray = getTableName(targetCapId);
	if (tableNameArray == null)
	{
		logDebug("tableNameArray is null, returning");
		return;
	}
	for (loopk in tableNameArray)
	{
		var tableName = tableNameArray[loopk];
		if (IsStrInArry(tableName,targetTableNameArray)) { 
			//1. Get appSpecificTableModel with source CAPID
			var sourceAppSpecificTable = getAppSpecificTableForLic(srcCapId,tableName);
			//2. Edit AppSpecificTableInfos with target CAPID
			var srcTableModel = null;
			if(sourceAppSpecificTable == null) {
				logDebug("sourceAppSpecificTable is null");
				return;
			}
			else {
			    srcTableModel = sourceAppSpecificTable.getAppSpecificTableModel();

			    tgtTableModelResult = aa.appSpecificTableScript.getAppSpecificTableModel(targetCapId, tableName);
			    if (tgtTableModelResult.getSuccess()) {
			    	tgtTableModel = tgtTableModelResult.getOutput();
			   	if (tgtTableModel == null) {
			   	 	logDebug("target table model is null");
			 	}
				else {
			    	tgtGroupName = tgtTableModel.getGroupName();
					srcTableModel.setGroupName(tgtGroupName);
			   	 }
			    }
			    else { logDebug("Error getting target table model " + tgtTableModelResult.getErrorMessage()); }
			}
			editResult = aa.appSpecificTableScript.editAppSpecificTableInfos(srcTableModel,
								targetCapId,
								null);
			if (editResult.getSuccess()) {
				logDebug("Successfully editing appSpecificTableInfos");
			}
			else {
				logDebug("Error editing appSpecificTableInfos " + editResult.getErrorMessage());
			}
		}
		else { 
			logDebug("Table " + tableName + " is not defined on target");
		}
	}
	
}

function IsStrInArry(eVal,argArr) {
   	for (x in argArr){
   		if (eVal == argArr[x]){
   			return true;
   		}
 	  }	
	return false;
} 

function getTableName(capId)
{
	var tableName = null;
	var result = aa.appSpecificTableScript.getAppSpecificGroupTableNames(capId);
	if(result.getSuccess())
	{
		tableName = result.getOutput();
		if(tableName!=null)
		{
			return tableName;
		}
	}
	return tableName;
}

function getAppSpecificTableForLic(capId,tableName)
{
	appSpecificTable = null;
	var s_result = aa.appSpecificTableScript.getAppSpecificTableModel(capId,tableName);
	if(s_result.getSuccess())
	{
		appSpecificTable = s_result.getOutput();
		if (appSpecificTable == null || appSpecificTable.length == 0)
		{
			logDebug("WARNING: no appSpecificTable on this CAP:" + capId);
			appSpecificTable = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to appSpecificTable: " + s_result.getErrorMessage());
		appSpecificTable = null;	
	}
	return appSpecificTable;
}

function copyParcelForLic(srcCapId, targetCapId)
{
	//1. Get parcels with source CAPID.
	var copyParcels = getParcelForLic(srcCapId);
	if (copyParcels == null || copyParcels.length == 0)
	{
		return;
	}
	//2. Get parcel with target CAPID.
	var targetParcels = getParcelForLic(targetCapId);
	//3. Check to see which parcel is matched in both source and target.
	for (i = 0; i < copyParcels.size(); i++)
	{
		sourceParcelModel = copyParcels.get(i);
		//3.1 Set target CAPID to source parcel.
		sourceParcelModel.setCapID(targetCapId);
		targetParcelModel = null;
		//3.2 Check to see if sourceParcel exist.
		if (targetParcels != null && targetParcels.size() > 0)
		{
			for (j = 0; j < targetParcels.size(); j++)
			{
				if (isMatchParcel(sourceParcelModel, targetParcels.get(j)))
				{
					targetParcelModel = targetParcels.get(j);
					break;
				}
			}
		}
		//3.3 It is a matched parcel model.
		if (targetParcelModel != null)
		{
			//3.3.1 Copy information from source to target.
			var tempCapSourceParcel = aa.parcel.warpCapIdParcelModel2CapParcelModel(targetCapId, sourceParcelModel).getOutput();
			var tempCapTargetParcel = aa.parcel.warpCapIdParcelModel2CapParcelModel(targetCapId, targetParcelModel).getOutput();
			aa.parcel.copyCapParcelModel(tempCapSourceParcel, tempCapTargetParcel);
			//3.3.2 Edit parcel with sourceparcel. 
			aa.parcel.updateDailyParcelWithAPOAttribute(tempCapTargetParcel);
		}
		//3.4 It is new parcel model.
		else
		{
			//3.4.1 Create new parcel.
			aa.parcel.createCapParcelWithAPOAttribute(aa.parcel.warpCapIdParcelModel2CapParcelModel(targetCapId, sourceParcelModel).getOutput());
		}
	}
}

function isMatchParcel(parcelScriptModel1, parcelScriptModel2)
{
	if (parcelScriptModel1 == null || parcelScriptModel2 == null)
	{
		return false;
	}
	if (parcelScriptModel1.getParcelNumber().equals(parcelScriptModel2.getParcelNumber()))
	{
		return true;
	}
	return	false;
}

function getParcelForLic(capId)
{
	capParcelArr = null;
	var s_result = aa.parcel.getParcelandAttribute(capId, null);
	if(s_result.getSuccess())
	{
		capParcelArr = s_result.getOutput();
		if (capParcelArr == null || capParcelArr.length == 0)
		{
			logDebug("WARNING: no parcel on this CAP:" + capId);
			capParcelArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to parcel: " + s_result.getErrorMessage());
		capParcelArr = null;	
	}
	return capParcelArr;
}

function copyPeopleForLic(srcCapId, targetCapId)
{
	//1. Get people with source CAPID.
	var capPeoples = getPeopleForLic(srcCapId);
	if (capPeoples == null || capPeoples.length == 0)
	{
		return;
	}
	//2. Get people with target CAPID.
	var targetPeople = getPeopleForLic(targetCapId);
	//3. Check to see which people is matched in both source and target.
	for (loopk in capPeoples)
	{
		sourcePeopleModel = capPeoples[loopk];
		//3.1 Set target CAPID to source people.
		sourcePeopleModel.getCapContactModel().setCapID(targetCapId);
		targetPeopleModel = null;
		//3.2 Check to see if sourcePeople exist.
		if (targetPeople != null && targetPeople.length > 0)
		{
			for (loop2 in targetPeople)
			{
				if (isMatchPeople(sourcePeopleModel, targetPeople[loop2]))
				{
					targetPeopleModel = targetPeople[loop2];
					break;
				}
			}
		}
		//3.3 It is a matched people model.
		if (targetPeopleModel != null)
		{
			//3.3.1 Copy information from source to target.
			aa.people.copyCapContactModel(sourcePeopleModel.getCapContactModel(), targetPeopleModel.getCapContactModel());
			//3.3.2 Copy contact address from source to target.
			if(targetPeopleModel.getCapContactModel().getPeople() != null && sourcePeopleModel.getCapContactModel().getPeople())
			{
				targetPeopleModel.getCapContactModel().getPeople().setContactAddressList(sourcePeopleModel.getCapContactModel().getPeople().getContactAddressList());
			}			

			//3.3.3 Edit People with source People information. 
			aa.people.editCapContactWithAttribute(targetPeopleModel.getCapContactModel());
		}
		//3.4 It is new People model.
		else
		{
			//3.4.1 Create new people.
			aa.people.createCapContactWithAttribute(sourcePeopleModel.getCapContactModel());
		}
	}
}

function isMatchPeople(capContactScriptModel, capContactScriptModel2)
{
	if (capContactScriptModel == null || capContactScriptModel2 == null)
	{
		return false;
	}
	var contactType1 = capContactScriptModel.getCapContactModel().getPeople().getContactType();
	var contactType2 = capContactScriptModel2.getCapContactModel().getPeople().getContactType();
	var firstName1 = capContactScriptModel.getCapContactModel().getPeople().getFirstName();
	var firstName2 = capContactScriptModel2.getCapContactModel().getPeople().getFirstName();
	var lastName1 = capContactScriptModel.getCapContactModel().getPeople().getLastName();
	var lastName2 = capContactScriptModel2.getCapContactModel().getPeople().getLastName();
	var fullName1 = capContactScriptModel.getCapContactModel().getPeople().getFullName();
	var fullName2 = capContactScriptModel2.getCapContactModel().getPeople().getFullName();
	if ((contactType1 == null && contactType2 != null) 
		|| (contactType1 != null && contactType2 == null))
	{
		return false;
	}
	if (contactType1 != null && !contactType1.equals(contactType2))
	{
		return false;
	}
	if ((firstName1 == null && firstName2 != null) 
		|| (firstName1 != null && firstName2 == null))
	{
		return false;
	}
	if (firstName1 != null && !firstName1.equals(firstName2))
	{
		return false;
	}
	if ((lastName1 == null && lastName2 != null) 
		|| (lastName1 != null && lastName2 == null))
	{
		return false;
	}
	if (lastName1 != null && !lastName1.equals(lastName2))
	{
		return false;
	}
	if ((fullName1 == null && fullName2 != null) 
		|| (fullName1 != null && fullName2 == null))
	{
		return false;
	}
	if (fullName1 != null && !fullName1.equals(fullName2))
	{
		return false;
	}
	return	true;
}

function getPeopleForLic(capId)
{
	capPeopleArr = null;
	var s_result = aa.people.getCapContactByCapID(capId);
	if(s_result.getSuccess())
	{
		capPeopleArr = s_result.getOutput();
		if(capPeopleArr != null || capPeopleArr.length > 0)
		{
			for (loopk in capPeopleArr)	
			{
				var capContactScriptModel = capPeopleArr[loopk];
				var capContactModel = capContactScriptModel.getCapContactModel();
				var peopleModel = capContactScriptModel.getPeople();
				var contactAddressrs = aa.address.getContactAddressListByCapContact(capContactModel);
				if (contactAddressrs.getSuccess())
				{
					var contactAddressModelArr = convertContactAddressModelArr(contactAddressrs.getOutput());
					peopleModel.setContactAddressList(contactAddressModelArr);    
				}
			}
		}
		
		else
		{
			logDebug("WARNING: no People on this CAP:" + capId);
			capPeopleArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to People: " + s_result.getErrorMessage());
		capPeopleArr = null;	
	}
	return capPeopleArr;
}

function convertContactAddressModelArr(contactAddressScriptModelArr)
{
	var contactAddressModelArr = null;
	if(contactAddressScriptModelArr != null && contactAddressScriptModelArr.length > 0)
	{
		contactAddressModelArr = aa.util.newArrayList();
		for(loopk in contactAddressScriptModelArr)
		{
			contactAddressModelArr.add(contactAddressScriptModelArr[loopk].getContactAddressModel());
		}
	}	
	return contactAddressModelArr;
}

function copyOwnerForLic(srcCapId, targetCapId)
{
	//1. Get Owners with source CAPID.
	var capOwners = getOwnerForLic(srcCapId);
	if (capOwners == null || capOwners.length == 0)
	{
		return;
	}
	//2. Get Owners with target CAPID.
	var targetOwners = getOwnerForLic(targetCapId);
	//3. Check to see which owner is matched in both source and target.
	for (loopk in capOwners)
	{
		sourceOwnerModel = capOwners[loopk];
		//3.1 Set target CAPID to source Owner.
		sourceOwnerModel.setCapID(targetCapId);
		targetOwnerModel = null;
		//3.2 Check to see if sourceOwner exist.
		if (targetOwners != null && targetOwners.length > 0)
		{
			for (loop2 in targetOwners)
			{
				if (isMatchOwner(sourceOwnerModel, targetOwners[loop2]))
				{
					targetOwnerModel = targetOwners[loop2];
					break;
				}
			}
		}
		//3.3 It is a matched owner model.
		if (targetOwnerModel != null)
		{
			//3.3.1 Copy information from source to target.
			aa.owner.copyCapOwnerModel(sourceOwnerModel, targetOwnerModel);
			//3.3.2 Edit owner with source owner information. 
			aa.owner.updateDailyOwnerWithAPOAttribute(targetOwnerModel);
		}
		//3.4 It is new owner model.
		else
		{
			//3.4.1 Create new Owner.
			aa.owner.createCapOwnerWithAPOAttribute(sourceOwnerModel);
		}
	}
}

function isMatchOwner(ownerScriptModel1, ownerScriptModel2)
{
	if (ownerScriptModel1 == null || ownerScriptModel2 == null)
	{
		return false;
	}
	var fullName1 = ownerScriptModel1.getOwnerFullName();
	var fullName2 = ownerScriptModel2.getOwnerFullName();
	if ((fullName1 == null && fullName2 != null) 
		|| (fullName1 != null && fullName2 == null))
	{
		return false;
	}
	if (fullName1 != null && !fullName1.equals(fullName2))
	{
		return false;
	}
	return	true;
}

function getOwnerForLic(capId)
{
	capOwnerArr = null;
	var s_result = aa.owner.getOwnerByCapId(capId);
	if(s_result.getSuccess())
	{
		capOwnerArr = s_result.getOutput();
		if (capOwnerArr == null || capOwnerArr.length == 0)
		{
			logDebug("WARNING: no Owner on this CAP:" + capId);
			capOwnerArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to Owner: " + s_result.getErrorMessage());
		capOwnerArr = null;	
	}
	return capOwnerArr;
}

function copyCapConditionForLic(srcCapId, targetCapId)
{
	//1. Get Cap condition with source CAPID.
	var capConditions = getCapConditionByCapIDForLic(srcCapId);
	if (capConditions == null || capConditions.length == 0)
	{
		return;
	}
	//2. Get Cap condition with target CAPID.
	var targetCapConditions = getCapConditionByCapIDForLic(targetCapId);
	//3. Check to see which Cap condition is matched in both source and target.
	for (loopk in capConditions)
	{
		sourceCapCondition = capConditions[loopk];
		//3.1 Set target CAPID to source Cap condition.
		sourceCapCondition.setCapID(targetCapId);
		targetCapCondition = null;
		//3.2 Check to see if source Cap condition exist in target CAP. 
		if (targetCapConditions != null && targetCapConditions.length > 0)
		{
			for (loop2 in targetCapConditions)
			{
				if (isMatchCapCondition(sourceCapCondition, targetCapConditions[loop2]))
				{
					targetCapCondition = targetCapConditions[loop2];
					break;
				}
			}
		}
		//3.3 It is a matched Cap condition model.
		if (targetCapCondition != null)
		{
			//3.3.1 Copy information from source to target.
			sourceCapCondition.setConditionNumber(targetCapCondition.getConditionNumber());
			//3.3.2 Edit Cap condition with source Cap condition information. 
			aa.capCondition.editCapCondition(sourceCapCondition);
		}
		//3.4 It is new Cap condition model.
		else
		{
			//3.4.1 Create new Cap condition.
			aa.capCondition.createCapCondition(sourceCapCondition);
		}
	}
}

function isMatchCapCondition(capConditionScriptModel1, capConditionScriptModel2)
{
	if (capConditionScriptModel1 == null || capConditionScriptModel2 == null)
	{
		return false;
	}
	var description1 = capConditionScriptModel1.getConditionDescription();
	var description2 = capConditionScriptModel2.getConditionDescription();
	if ((description1 == null && description2 != null) 
		|| (description1 != null && description2 == null))
	{
		return false;
	}
	if (description1 != null && !description1.equals(description2))
	{
		return false;
	}
	var conGroup1 = capConditionScriptModel1.getConditionGroup();
	var conGroup2 = capConditionScriptModel2.getConditionGroup();
	if ((conGroup1 == null && conGroup2 != null) 
		|| (conGroup1 != null && conGroup2 == null))
	{
		return false;
	}
	if (conGroup1 != null && !conGroup1.equals(conGroup2))
	{
		return false;
	}
	return true;
}

function getCapConditionByCapIDForLic(capId)
{
	capConditionScriptModels = null;
	
	var s_result = aa.capCondition.getCapConditions(capId);
	if(s_result.getSuccess())
	{
		capConditionScriptModels = s_result.getOutput();
		if (capConditionScriptModels == null || capConditionScriptModels.length == 0)
		{
			logDebug("WARNING: no cap condition on this CAP:" + capId);
			capConditionScriptModels = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to get cap condition: " + s_result.getErrorMessage());
		capConditionScriptModels = null;	
	}
	return capConditionScriptModels;
}

function copyAdditionalInfoForLic(srcCapId, targetCapId)
{
	//1. Get Additional Information with source CAPID.  (BValuatnScriptModel)
	var  additionalInfo = getAdditionalInfoForLic(srcCapId);
	if (additionalInfo == null)
	{
		return;
	}
	//2. Get CAP detail with source CAPID.
	var  capDetail = getCapDetailByID(srcCapId);
	//3. Set target CAP ID to additional info.
	additionalInfo.setCapID(targetCapId);
	if (capDetail != null)
	{
		capDetail.setCapID(targetCapId);
	}
	//4. Edit or create additional infor for target CAP.
	aa.cap.editAddtInfo(capDetail, additionalInfo);
}

//Return BValuatnScriptModel for additional info.
function getAdditionalInfoForLic(capId)
{
	bvaluatnScriptModel = null;
	var s_result = aa.cap.getBValuatn4AddtInfo(capId);
	if(s_result.getSuccess())
	{
		bvaluatnScriptModel = s_result.getOutput();
		if (bvaluatnScriptModel == null)
		{
			logDebug("WARNING: no additional info on this CAP:" + capId);
			bvaluatnScriptModel = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to get additional info: " + s_result.getErrorMessage());
		bvaluatnScriptModel = null;	
	}
	// Return bvaluatnScriptModel
	return bvaluatnScriptModel;
}

function getCapDetailByID(capId) {
	capDetailScriptModel = null;
	var s_result = aa.cap.getCapDetail(capId);
	if(s_result.getSuccess()) {
		capDetailScriptModel = s_result.getOutput();
		if (capDetailScriptModel == null) {
			logDebug("WARNING: no cap detail on this CAP:" + capId);
			capDetailScriptModel = null;
		}
	}
	else {
		logDebug("ERROR: Failed to get cap detail: " + s_result.getErrorMessage());
		capDetailScriptModel = null;	
	}
	// Return capDetailScriptModel
	return capDetailScriptModel;
}


function createRefLicProf(rlpId,rlpType,pContactType)
	{
	//Creates/updates a reference licensed prof from a Contact
	//06SSP-00074, modified for 06SSP-00238
	var updating = false;
	var capContResult = aa.people.getCapContactByCapID(capId);
	if (capContResult.getSuccess())
		{ conArr = capContResult.getOutput();  }
	else
		{
		logDebug ("**ERROR: getting cap contact: " + capAddResult.getErrorMessage());
		return false;
		}

	if (!conArr.length)
		{
		logDebug ("**WARNING: No contact available");
		return false;
		}


	var newLic = getRefLicenseProf(rlpId)

	if (newLic)
		{
		updating = true;
		logDebug("Updating existing Ref Lic Prof : " + rlpId);
		}
	else
		var newLic = aa.licenseScript.createLicenseScriptModel();

	//get contact record
	if (pContactType==null)
		var cont = conArr[0]; //if no contact type specified, use first contact
	else
		{
		var contFound = false;
		for (yy in conArr)
			{
			if (pContactType.equals(conArr[yy].getCapContactModel().getPeople().getContactType()))
				{
				cont = conArr[yy];
				contFound = true;
				break;
				}
			}
		if (!contFound)
			{
			logDebug ("**WARNING: No Contact found of type: "+pContactType);
			return false;
			}
		}

	peop = cont.getPeople();
	addr = peop.getCompactAddress();

	newLic.setContactFirstName(cont.getFirstName());
	//newLic.setContactMiddleName(cont.getMiddleName());  //method not available
	newLic.setContactLastName(cont.getLastName());
	newLic.setBusinessName(peop.getBusinessName());
	newLic.setAddress1(addr.getAddressLine1());
	newLic.setAddress2(addr.getAddressLine2());
	newLic.setAddress3(addr.getAddressLine3());
	newLic.setCity(addr.getCity());
	newLic.setState(addr.getState());
	newLic.setZip(addr.getZip());
	newLic.setPhone1(peop.getPhone1());
	newLic.setPhone2(peop.getPhone2());
	newLic.setEMailAddress(peop.getEmail());
	newLic.setFax(peop.getFax());

	newLic.setAgencyCode(aa.getServiceProviderCode());
	newLic.setAuditDate(sysDate);
	newLic.setAuditID(currentUserID);
	newLic.setAuditStatus("A");

	if (AInfo["Insurance Co"]) 		newLic.setInsuranceCo(AInfo["Insurance Co"]);
	if (AInfo["Insurance Amount"]) 		newLic.setInsuranceAmount(parseFloat(AInfo["Insurance Amount"]));
	if (AInfo["Insurance Exp Date"]) 	newLic.setInsuranceExpDate(aa.date.parseDate(AInfo["Insurance Exp Date"]));
	if (AInfo["Policy #"]) 			newLic.setPolicy(AInfo["Policy #"]);

	if (AInfo["Business License #"]) 	newLic.setBusinessLicense(AInfo["Business License #"]);
	if (AInfo["Business License Exp Date"]) newLic.setBusinessLicExpDate(aa.date.parseDate(AInfo["Business License Exp Date"]));

	newLic.setLicenseType(rlpType);

	if(addr.getState() != null)
		newLic.setLicState(addr.getState());
	else
		newLic.setLicState("AK"); //default the state if none was provided

	newLic.setStateLicense(rlpId);

	if (updating)
		myResult = aa.licenseScript.editRefLicenseProf(newLic);
	else
		myResult = aa.licenseScript.createRefLicenseProf(newLic);

	if (myResult.getSuccess())
		{
		logDebug("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType);
		logMessage("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType);
		return true;
		}
	else
		{
		logDebug("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		logMessage("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		return false;
		}
	}


function getRenewalCapModel(renRecordID) {
	
	renRecordIDPieces = renRecordID.split("-");
	if (renRecordIDPieces != null && renRecordIDPieces.length == 3) {
		renCapIdResult = aa.cap.getCapID(renRecordIDPieces[0].toString(), renRecordIDPieces[1].toString(), renRecordIDPieces[2].toString());
		if (renCapIdResult.getSuccess()) {
			renewalCapId = renCapIdResult.getOutput();		
			renCapModel = getCAPModel(renewalCapId);
			return renCapModel;
		}
	}
	return null;

}

function getCAPModel(capIDModel) {
	var capModel = aa.cap.getCapViewBySingle4ACA(capIDModel);
	if (capModel == null) {
		logDebug("Fail to get CAP model: " + capIDModel.toString());
		return null;
	}
	
	return capModel;
}


function convert2RealCAP(capModel, transactions)
{
	var originalCAPID = capModel.getCapID().getCustomID();
	var originalCAP = capModel;
	var capWithTemplateResult = aa.cap.getCapWithTemplateAttributes(capModel);
	var capWithTemplate = null;
	if (capWithTemplateResult.getSuccess()) 	{
		capWithTemplate = capWithTemplateResult.getOutput();
	}
	else {
		logDebug(capWithTemplateResult.getErrorMessage());
		return null;
	}
	
	// 2. Convert asi group.
	aa.cap.convertAppSpecificInfoGroups2appSpecificInfos4ACA(capModel);
	if (capModel.getAppSpecificTableGroupModel() != null) {
			aa.cap.convertAppSpecTableField2Value4ACA(capModel);
	}
	// 4. Triger event before convert to real CAP.
	aa.cap.runEMSEScriptBeforeCreateRealCap(capModel, null);
	// 5. Convert to real CAP.
	convertResult = aa.cap.createRegularCapModel4ACA(capModel, null, false, false);
	if (convertResult.getSuccess()) {
		capModel = convertResult.getOutput();
		logDebug("Commit OK: Convert partial CAP to real CAP successful: " + originalCAPID + " to " + capModel.getCapID().getCustomID());
	}
	else {
		logDebug(convertResult.getErrorMessage());
		return null;
	}
	// 6. Create template after convert to real CAP.
	aa.cap.createTemplateAttributes(capWithTemplate, capModel);
	// Triger event after convert to real CAP.
	aa.cap.runEMSEScriptAfterCreateRealCap(capModel, null);
	return capModel;
}

function changeApplicantToLicenseHolder(licCapId) {

	var conToChange = null; 
	consResult = aa.people.getCapContactByCapID(licCapId);
	if (consResult.getSuccess()) {
		cons = consResult.getOutput();
		for (thisCon in cons) {
			if (cons[thisCon].getCapContactModel().getPeople().getContactType() == "Applicant") { 
				conToChange = cons[thisCon].getCapContactModel(); 
				p = conToChange.getPeople(); 
				contactAddressListResult = aa.address.getContactAddressListByCapContact(conToChange);
				if (contactAddressListResult.getSuccess()) 
					contactAddressList = contactAddressListResult.getOutput();
				convertedContactAddressList = convertContactAddressModelArr(contactAddressList);
				p.setContactType("License Holder"); 
				p.setContactAddressList(convertedContactAddressList);
				conToChange.setPeople(p); 
				aa.people.editCapContactWithAttribute(conToChange);
			}
		}
	}
}

function checklistSatisfied(gName) { 

	var retValue = false;
	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(capId);
	if (appSpecInfoResult.getSuccess()) {
		var appspecArr = appSpecInfoResult.getOutput();

		if (appspecArr) {
			retValue = true;
			for (i in appspecArr) {
				var appspecItem = appspecArr[i];
				var appSpecGroup = "" + appspecItem.getCheckboxType();
				if (appSpecGroup == gName) {
					if (!matches(("" + appspecItem.getChecklistComment()), "Met", "NA", "N/A", "Not Required")) 
						return false;
				}
			}
		}
	}
	else {
		logDebug("Error getting app spec info " + appSpecInfoResult.getErrorMessage());
	}
	return retValue;
}

function copyContactsWithAddresses(sourceCapId, targetCapId) {
	
	var capPeoples = getPeopleWithAddresses(capId);
	if (capPeoples != null && capPeoples.length > 0) {
		for (loopk in capPeoples) {
			sourcePeopleModel = capPeoples[loopk];
			sourcePeopleModel.getCapContactModel().setCapID(targetCapId);
			aa.people.createCapContactWithAttribute(sourcePeopleModel.getCapContactModel());
			logDebug("added contact");
		}
	}
	else {
		logDebug("No peoples on source");
	}
}

function getPeopleWithAddresses(capId)
{
	capPeopleArr = null;
	var s_result = aa.people.getCapContactByCapID(capId);
	if(s_result.getSuccess())
	{
		capPeopleArr = s_result.getOutput();
		if(capPeopleArr != null || capPeopleArr.length > 0)
		{
			for (loopk in capPeopleArr)	
			{
				var capContactScriptModel = capPeopleArr[loopk];
				var capContactModel = capContactScriptModel.getCapContactModel();
				var peopleModel = capContactScriptModel.getPeople();
				var contactAddressrs = aa.address.getContactAddressListByCapContact(capContactModel);
				if (contactAddressrs.getSuccess())
				{
					var contactAddressModelArr = convertContactAddressModelArr(contactAddressrs.getOutput());
					peopleModel.setContactAddressList(contactAddressModelArr);    
				}
			}
		}
		
		else
		{
			capPeopleArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to People: " + s_result.getErrorMessage());
		capPeopleArr = null;	
	}
	return capPeopleArr;
}
function convertContactAddressModelArr(contactAddressScriptModelArr)
{
	var contactAddressModelArr = null;
	if(contactAddressScriptModelArr != null && contactAddressScriptModelArr.length > 0)
	{
		logDebug(contactAddressScriptModelArr.length + " addresses");
		contactAddressModelArr = aa.util.newArrayList();
		for(loopk in contactAddressScriptModelArr)
		{
			contactAddressModelArr.add(contactAddressScriptModelArr[loopk].getContactAddressModel());
		}
	}	
	return contactAddressModelArr;
}


