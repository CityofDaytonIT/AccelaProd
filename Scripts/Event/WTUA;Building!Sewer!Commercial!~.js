//assess fees
if(wfTask == "Application Submittal" && wfStatus == "Accepted" && AInfo["Job Cost"] > 0){
	updateFee("SWR_010","B_SEWER","FINAL",AInfo["Job Cost"],"N");
}

