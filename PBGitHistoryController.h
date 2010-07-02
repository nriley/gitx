//
//  PBGitHistoryView.h
//  GitX
//
//  Created by Pieter de Bie on 19-09-08.
//  Copyright 2008 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import "PBGitCommit.h"
#import "PBGitTree.h"
#import "PBViewController.h"
#import "PBCollapsibleSplitView.h"

@class PBQLOutlineView;
@class PBGitSidebarController;
@class PBGitGradientBarView;
@class PBRefController;
@class QLPreviewPanel;
@class PBCommitList;
@class PBSourceViewItem;

@interface PBGitHistoryController : PBViewController {
	IBOutlet PBRefController *refController;
	IBOutlet PBCommitList* commitList;
	IBOutlet PBCollapsibleSplitView *historySplitView;
	IBOutlet PBGitGradientBarView *upperToolbarView;
	IBOutlet PBGitGradientBarView *scopeBarView;

	IBOutlet NSSearchField *searchField;
	IBOutlet NSArrayController* commitController;
	IBOutlet NSTreeController* treeController;
	IBOutlet NSOutlineView* fileBrowser;
	IBOutlet NSButton *mergeButton;
	IBOutlet NSButton *cherryPickButton;
	IBOutlet NSButton *rebaseButton;
	IBOutlet NSButton *allBranchesFilterItem;
	IBOutlet NSButton *localRemoteBranchesFilterItem;
	IBOutlet NSButton *selectedBranchFilterItem;

	IBOutlet id webView;

    // moved from PBGitSidebarController
    IBOutlet NSSegmentedControl * remoteControls;

    __weak QLPreviewPanel* previewPanel;

	int selectedCommitDetailsIndex;
	BOOL forceSelectionUpdate;
	NSArray *currentFileBrowserSelectionPath;

	PBGitTree *gitTree;
	PBGitCommit *webCommit;
	PBGitCommit *selectedCommit;
	NSString *shaToSelectAfterRefresh;

    PBSourceViewItem * sidebarRemotes;
    NSOutlineView * sidebarSourceView;
}

@property (assign) int selectedCommitDetailsIndex;
@property (retain) PBGitCommit *webCommit;
@property (retain) PBGitTree* gitTree;
@property (readonly) NSArrayController *commitController;
@property (readonly) PBCommitList *commitList;
@property (readonly) PBRefController *refController;
@property (assign) NSOutlineView * sidebarSourceView;
@property (assign) PBSourceViewItem * sidebarRemotes;
@property (readonly) NSSearchField *searchField;
@property (retain) IBOutlet id webView;

- (IBAction) setDetailedView:(id)sender;
- (IBAction) setTreeView:(id)sender;
- (IBAction) setBranchFilter:(id)sender;
- (IBAction) refresh:(id)sender;
- (IBAction) toggleQLPreviewPanel:(id)sender;
- (IBAction) openSelectedFile:(id)sender;

- (BOOL) selectCommit: (NSString*) commit;
- (void) updateKeys;

- (void) updateQuicklookForce: (BOOL) force;

- (void) scrollSelectionToTopOfViewFrom:(NSInteger)oldIndex;

// Moved over Sidebar methods
- (IBAction) fetchPullPushAction:(id)sender;
- (void) updateRemoteControls:(PBGitRef *)forRef;

// Context menu methods
- (NSMenu *)contextMenuForTreeView;
- (NSArray *)menuItemsForPaths:(NSArray *)paths;
- (void)showCommitsFromTree:(id)sender;
- (void)showInFinderAction:(id)sender;
- (void)openFilesAction:(id)sender;

// Repository Methods
- (IBAction) createBranch:(id)sender;
- (IBAction) createTag:(id)sender;
- (IBAction) showAddRemoteSheet:(id)sender;
- (IBAction) merge:(id)sender;
- (IBAction) cherryPick:(id)sender;
- (IBAction) rebase:(id)sender;

- (void) copyCommitInfo;

- (BOOL) hasNonlinearPath;

- (NSMenu *)tableColumnMenu;

- (BOOL)splitView:(NSSplitView *)sender canCollapseSubview:(NSView *)subview;
- (BOOL)splitView:(NSSplitView *)splitView shouldCollapseSubview:(NSView *)subview forDoubleClickOnDividerAtIndex:(NSInteger)dividerIndex;
- (CGFloat)splitView:(NSSplitView *)sender constrainMinCoordinate:(CGFloat)proposedMin ofSubviewAt:(NSInteger)offset;
- (CGFloat)splitView:(NSSplitView *)sender constrainMaxCoordinate:(CGFloat)proposedMax ofSubviewAt:(NSInteger)offset;

@end
