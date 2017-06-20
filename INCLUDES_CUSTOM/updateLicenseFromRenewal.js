function updateLicenseFromRenewal() {
	parentLicenseCAPID = getParentLicenseCapID(capId); 
	
	jsDate = new Date()
	jsDate.setHours(0,0,0,0)
	jsDate.setMonth(11)
	jsDate.setDate(31)
	
	switch(""+AInfo["Select Number of Years for Registration"]) {
		case "1 Year":
			jsDate.setFullYear(jsDate.getFullYear()+1)
			break;
		case "2 Year":
			jsDate.setFullYear(jsDate.getFullYear()+2)
			break;
	}

	// New Expire date	
	newExpireDate = jsDateToASIDate(jsDate)

	//Update License
	var gm = aa.appSpecificTableScript.getAppSpecificGroupTableNames(parentLicenseCAPID).getOutput(); 
	for (x in gm) removeASITable(gm[x], parentLicenseCAPID);
	copyAppSpecific(parentLicenseCAPID); 
	copyASITables(capId,parentLicenseCAPID); 
	copyContacts(capId,parentLicenseCAPID);  
	
	saveId = capId; 
	capId = parentLicenseCAPID;
	
	licEditExpInfo("Active",newExpireDate); 
	logDebug("License "+parentLicenseCAPID+" has been renewed and will expire on: "+ newExpireDate );
	updateAppStatus("Issued","Updated via Renewal");
	capId = saveId;
	
	//Update LP
	parentCapId = aa.cap.getCapID(parentLicenseCAPID.ID1,parentLicenseCAPID.ID2,parentLicenseCAPID.ID3).getOutput();
	var lic = getRefLicenseProf(parentCapId.getCustomID()); 
	
	if (lic != null){
		lic.setLicenseExpirationDate(aa.date.parseDate(newExpireDate))
		lic.setLicenseLastRenewalDate(aa.date.getCurrentDate())	
		aa.licenseScript.editRefLicenseProf(lic);
	}
}