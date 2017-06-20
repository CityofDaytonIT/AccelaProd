//Script 11
if (matches(wfTask,"Application Submittal","Application Submitted") && wfStatus=="Accepted") {
	editAppSpecific("Application Date",dateAdd(null,0));
	editAppSpecific("Plan Review Expiration Date",dateAdd(null,180));
	logDebug("Application Submittal:: Application Date: "+AInfo["Application Date"]+" Plan Review Expiration Date: "+AInfo["Plan Review Expiration Date"]);
}

//Script 12
if (wfTask.slice(-6) == "Review") {
	editAppSpecific("Plan Review Expiration Date",dateAdd(null,180));
	logDebug("Review:: Plan Review Expiration Date: "+AInfo["Plan Review Expiration Date"]);
}

//Script 14
if (matches((""+capStatus).toUpperCase(), "FINAL", "FINALED", "CLOSE", "CLOSED" )) {
	addStdCondition("Finalled Permit","Finalled Permit")
}

//Script 15
if (matches((""+capStatus).toUpperCase(), "WITHDRAW", "WITHDRAWN", "WITHDRAWAL", "CANCEL", "CANCELED", "EXPIRE", "EXPIRED" )) {
	addStdCondition("Finalled Permit","Permit Read Only")
}

//Script 56
if(matches(wfTask,"Permit Issuance") && matches(wfStatus,"Issued")){
	editAppSpecific("Issued Date",dateAdd(null,0));
	editAppSpecific("Permit Expiration Date",dateAdd(null,365));
	logDebug("Permit Issuance:: Issued Date: "+AInfo["Issued Date"]+" Permit Expiration Date: "+AInfo["Permit Expiration Date"]);
}