function getAdditionalInfo(){
	//get record details
	var itemCap = capId
	if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args

	var cdScriptObjResult = aa.cap.getCapDetail(itemCap);
	if (!cdScriptObjResult.getSuccess())
		{ logDebug("**ERROR: No cap detail script object : " + cdScriptObjResult.getErrorMessage()) ; return false; }

	var cdScriptObj = cdScriptObjResult.getOutput();

	if (!cdScriptObj)
		{ logDebug("**ERROR: No cap detail script object") ; return false; }

	cd = cdScriptObj.getCapDetailModel();

	cd.setTotalJobCost(9999999);
	//Job Cost
	var AITotalJobCost = cd.getTotalJobCost();logDebug("AITotalJobCost: "+AITotalJobCost);
	//Building Count
	var AIBuildingCount = cd.getBuildingCount();logDebug("AIBuildingCount: "+AIBuildingCount);
	//House Count
	var AIHouseCount = cd.getHouseCount();logDebug("AIHouseCount: "+AIHouseCount);
}