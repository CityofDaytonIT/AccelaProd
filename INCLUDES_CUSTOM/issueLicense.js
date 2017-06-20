function issueLicense() {
	//SET CONTACT STATE
	var capContactResult = aa.people.getCapContactByCapID(capId);
	if(capContactResult.getSuccess()){
		var contactList = capContactResult.getOutput();
		for(i in contactList){
			thisContact = contactList[i];
			conModel = thisContact.getCapContactModel();
			conModel.setState("OH");
			logDebug(aa.people.editContactByCapContact(conModel).getSuccess());
		}
	}
	
	newLicId = createParent(appTypeArray[0], appTypeArray[1], appTypeArray[2], "License",null);
	if(newLicId){
		editContactType("Applicant", "License Holder", newLicId);
		copyOwner(capId, newLicId);
		updateAppStatus("Issued","Original Issuance",newLicId);
		updateTask("License","Active","Updated via Script","Updated via Script",null,newLicId);
		copyAppSpecific(newLicId);
		copyASITables(capId,newLicId);
		
		jsDate = new Date();
		jsDate.setHours(0,0,0,0);
		
		switch(""+AInfo["Select Number of Years for Registration"]){
			case "1 Year":
				if(jsDate.getMonth() == 11){
					jsDate.setFullYear(jsDate.getFullYear()+1);
				}
				else{
					jsDate.setFullYear(jsDate.getFullYear());
				}
				break;
			case "2 Year":
				if(jsDate.getMonth() == 11){
					jsDate.setFullYear(jsDate.getFullYear()+2);
				}
				else{
					jsDate.setFullYear(jsDate.getFullYear()+1);
				}
				break;
		}
		
		jsDate.setMonth(11);
		jsDate.setDate(31);
		newLicIdString = newLicId.getCustomID();
		lic = new licenseObject(newLicIdString,newLicId);
		lic.setStatus("Active");
		lic.setExpiration(jsDateToASIDate(jsDate));
		saveId = capId;
		capId = newLicId;
		AInfo["Business License #"] = newLicIdString;
		createRefLicProf(newLicIdString,"Contractor","License Holder");
		capId = saveId;
		refLP = getRefLicenseProf(newLicIdString);
		refLP.setLicenseExpirationDate(aa.date.parseDate(jsDateToASIDate(jsDate)));
		refLP.setLicenseIssueDate(aa.date.getCurrentDate());
		refLP.setBusinessName2("Issued");
		aa.licenseScript.editRefLicenseProf(refLP);
		aa.licenseScript.associateLpWithCap(newLicId,refLP);
		
	}
}
