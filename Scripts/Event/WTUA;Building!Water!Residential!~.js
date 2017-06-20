//assess fees
if(wfTask == "Application Submittal" && wfStatus == "Accepted" && AInfo["Job Cost"] > 0){
	updateFee("WTR_010","B_WATER","FINAL",AInfo["Job Cost"],"N");
}

