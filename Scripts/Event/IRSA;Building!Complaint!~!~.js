//Script 21
if (inspResult == "Refer to Housing") {
	childId = createChild("Enforcement","Complaint","NA","NA",capName )

	copyAppSpecific(capId, childId)
	copyOwner(capId, childId)	
	aa.asset.cloneAssets(cap.getCapModel(), childId); 
}