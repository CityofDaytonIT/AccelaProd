//Script #23
try {
	if ( matches(AInfo["Change Case Type"],"Y","Yes") ){
		editAppName(""+AInfo["Case Type"])
		editAppSpecific("Change Case Type","N") //Need to verify if this is needed
	}
}
catch(err){
	logDebug("SharePoint Script 23: " + err)
}
