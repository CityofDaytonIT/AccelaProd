//Script 4
if (matches(appTypeArray[3], "Application", "Renewal")) {
	try{
		fSched = aa.finance.getFeeScheduleByCapID(capId).getOutput()
		if (AInfo["Select Number of Years for Registration"] == "1 Year")
			addFee("LIC01", fSched, "FINAL", 1, "Y")
		if (AInfo["Select Number of Years for Registration"] == "2 Year")
			addFee("LIC02", fSched, "FINAL", 1, "Y")
	} catch(err) {
		logDebug("***Error adding fee: " + err)
	}
}		
